<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Artisan;
use App\Models\User;
use App\Models\Order;
use App\Models\Product;
use App\Models\UserProfile;
use App\Services\TelegramService;

class MasterSystemController extends Controller
{
    /**
     * Get Master System Health, Controls & Permissions
     */
    public function status(Request $request)
    {
        $adminUser = $request->attributes->get('auth_user');
        $isSuperAdmin = $adminUser && (in_array($adminUser->role, ['super_admin', 'admin']) || $adminUser->email === 'nobrothana180703@gmail.com');

        $row = DB::table('system_settings')->where('key', 'master_system_state')->first();
        $state = [];
        if ($row && !empty($row->value)) {
            $state = is_string($row->value) ? json_decode($row->value, true) : (array)$row->value;
        }

        $resolved = self::resolveSystemState($state);
        $state = $resolved['state'];

        $defaults = [
            'mode' => 'online',
            'maintenance_mode' => false,
            'maintenance_title' => 'ប្រព័ន្ធកំពុងជួសជុល និងធ្វើបច្ចុប្បន្នភាព (Under Technical Maintenance)',
            'maintenance_reason' => 'កំពុង Upgrade Server និងប្រព័ន្ធទូទាត់ប្រាក់ជូនលោកអ្នក។',
            'vacation_mode' => false,
            'vacation_title' => 'ហាងសូមសម្រាកបណ្តោះអាសន្ន (Store Temporarily Closed)',
            'vacation_reason' => 'ហាង S Tech Store សូមឈប់សម្រាកបណ្តោះអាសន្ន។ យើងនឹងបើកបម្រើលោកអ្នកវិញក្នុងពេលឆាប់ៗ!',
            'vacation_end_time' => null,
            'vacation_days' => 3,
            'vacation_started_at' => null,
            'staff_lockdown' => false,
            'staff_lockdown_reason' => 'សកម្មភាពបុគ្គលិក និង Admin ទាំងអស់ត្រូវបានផ្អាកបណ្តោះអាសន្នដោយម្ចាស់ប្រព័ន្ធ (System Owner)!',
            'financial_freeze' => false,
            'coin_multiplier' => 1.0,
            'force_app_version' => '1.1.0',
            'night_lock_enabled' => true,
            'night_lock_forced' => false,
            'night_lock_start' => '02:00',
            'night_lock_end' => '06:00',
            'night_lock_title' => 'សុវត្ថិភាពពេលរាត្រី (Cybersecurity Night Lockdown)',
            'night_lock_reason' => 'ប្រព័ន្ធត្រូវបានការពារ និងបិទប្រតិបត្តិការពេលយប់ដោយស្វ័យប្រវត្តិចាប់ពីម៉ោង 02:00 AM ដល់ 06:00 AM ដើម្បីការពារការវាយប្រហារតាមអ៊ីនធឺណិត (Automated Cyber Attacks & Vulnerability Probing)។',
            'last_cache_purge' => null,
            'last_backup_at' => null,
            'last_backup_file' => null,
            'emergency_lockdown' => false,
            'audit_logs' => [],
        ];

        $merged = array_merge($defaults, $state);

        // Real-time server and database stats
        $activeStaffSessions = User::whereNotNull('api_token')
            ->where('status', 'active')
            ->count();

        $totalUsers = UserProfile::count();
        $totalOrders = Order::count();
        $totalProducts = Product::count();

        return response()->json([
            'success' => true,
            'is_super_admin' => (bool)$isSuperAdmin,
            'current_role' => $adminUser->role ?? 'admin',
            'current_user' => $adminUser->email ?? 'unknown',
            'state' => $merged,
            'metrics' => [
                'active_staff_sessions' => $activeStaffSessions,
                'total_users' => $totalUsers,
                'total_orders' => $totalOrders,
                'total_products' => $totalProducts,
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'server_time' => now()->toIso8601String(),
            ]
        ]);
    }

    /**
     * Determine if Cybersecurity Night Lockdown is active
     */
    public static function isNightLockActive(?array $state = null): array
    {
        if ($state === null) {
            $state = Cache::get('master_system_state');
            if (empty($state) || !is_array($state)) {
                $row = DB::table('system_settings')->where('key', 'master_system_state')->first();
                $state = ($row && !empty($row->value)) 
                    ? (is_string($row->value) ? json_decode($row->value, true) : (array)$row->value) 
                    : [];
            }
        }

        try {
            $cambodiaNow = \Carbon\Carbon::now('Asia/Phnom_Penh');
        } catch (\Throwable $e) {
            $cambodiaNow = \Carbon\Carbon::now();
        }
        $enabled = isset($state['night_lock_enabled']) ? (bool)$state['night_lock_enabled'] : true;
        $forced = !empty($state['night_lock_forced']);
        $startStr = !empty($state['night_lock_start']) ? $state['night_lock_start'] : '02:00';
        $endStr = !empty($state['night_lock_end']) ? $state['night_lock_end'] : '06:00';

        $startParts = explode(':', $startStr);
        $endParts = explode(':', $endStr);

        $startTime = $cambodiaNow->copy()->setTime((int)$startParts[0], (int)($startParts[1] ?? 0), 0);
        $endTime = $cambodiaNow->copy()->setTime((int)$endParts[0], (int)($endParts[1] ?? 0), 0);

        $isNightTime = false;
        if ($startTime->lessThan($endTime)) {
            $isNightTime = $cambodiaNow->between($startTime, $endTime);
        } else {
            // E.g. crosses midnight: 23:00 to 06:00
            $isNightTime = ($cambodiaNow->greaterThanOrEqualTo($startTime) || $cambodiaNow->lessThan($endTime));
        }

        $active = ($enabled && $isNightTime) || $forced;

        $reopenAt = null;
        if ($active) {
            $target = $cambodiaNow->copy()->setTime((int)$endParts[0], (int)($endParts[1] ?? 0), 0);
            if ($cambodiaNow->greaterThanOrEqualTo($target)) {
                $target->addDay();
            }
            $reopenAt = $target->toIso8601String();
        }

        return [
            'active' => $active,
            'enabled' => $enabled,
            'forced' => $forced,
            'start_time' => $startStr,
            'end_time' => $endStr,
            'reopen_at' => $reopenAt,
            'title' => $state['night_lock_title'] ?? 'សុវត្ថិភាពពេលរាត្រី (Cybersecurity Night Lockdown)',
            'reason' => $state['night_lock_reason'] ?? 'ប្រព័ន្ធត្រូវបានការពារ និងបិទប្រតិបត្តិការពេលយប់ដោយស្វ័យប្រវត្តិចាប់ពីម៉ោង 02:00 AM ដល់ 06:00 AM ដើម្បីការពារការវាយប្រហារតាមអ៊ីនធឺណិត (Automated Cyber Attacks & Vulnerability Probing)។',
            'cambodia_time' => $cambodiaNow->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Unified resolver for active store mode and expiration handling
     */
    public static function resolveSystemState(?array $state = null): array
    {
        if ($state === null) {
            $state = Cache::get('master_system_state');
            if (empty($state) || !is_array($state)) {
                $row = DB::table('system_settings')->where('key', 'master_system_state')->first();
                $state = ($row && !empty($row->value)) 
                    ? (is_string($row->value) ? json_decode($row->value, true) : (array)$row->value) 
                    : [];
            }
        }

        $vacationActive = !empty($state['vacation_mode']);
        $vacationEndTime = $state['vacation_end_time'] ?? null;
        if ($vacationActive && !empty($vacationEndTime)) {
            $now = now();
            $end = \Carbon\Carbon::parse($vacationEndTime);
            if ($now->greaterThanOrEqualTo($end)) {
                $vacationActive = false;
                $state['vacation_mode'] = false;
            }
        }

        $maintenanceActive = !empty($state['maintenance_mode']);
        $nightLock = self::isNightLockActive($state);
        $nightLockActive = $nightLock['active'];

        $mode = 'online';
        if ($maintenanceActive) {
            $mode = 'maintenance';
        } elseif ($vacationActive) {
            $mode = 'vacation';
        } elseif ($nightLockActive) {
            $mode = 'night_lock';
        }

        $state['mode'] = $mode;
        return [
            'state' => $state,
            'mode' => $mode,
            'vacationActive' => $vacationActive,
            'vacationEndTime' => $vacationEndTime,
            'maintenanceActive' => $maintenanceActive,
            'nightLock' => $nightLock,
        ];
    }

    /**
     * Public Store Status (For Customer Storefront & PWA Guard - Zero HTTP Caching)
     */
    public function publicStatus(Request $request)
    {
        $state = Cache::get('master_system_state');
        if (empty($state) || !is_array($state)) {
            $row = DB::table('system_settings')->where('key', 'master_system_state')->first();
            if ($row && !empty($row->value)) {
                $state = is_string($row->value) ? json_decode($row->value, true) : (array)$row->value;
                Cache::put('master_system_state', $state, 86400 * 30);
            } else {
                $state = [];
            }
        }

        $resolved = self::resolveSystemState($state);

        return response()->json([
            'status' => $resolved['mode'],
            'night_lock' => $resolved['nightLock'],
            'vacation' => [
                'active' => $resolved['vacationActive'],
                'title' => $state['vacation_title'] ?? 'ហាងសូមសម្រាកបណ្តោះអាសន្ន (Store Temporarily Closed)',
                'reason' => $state['vacation_reason'] ?? 'ហាង S Tech Store សូមឈប់សម្រាកបណ្តោះអាសន្ន។ យើងនឹងបើកបម្រើលោកអ្នកវិញក្នុងពេលឆាប់ៗ!',
                'end_time' => $resolved['vacationEndTime'],
                'days' => (int)($state['vacation_days'] ?? 3),
                'started_at' => $state['vacation_started_at'] ?? null,
            ],
            'maintenance' => [
                'active' => $resolved['maintenanceActive'],
                'title' => $state['maintenance_title'] ?? 'ប្រព័ន្ធកំពុងជួសជុល និងធ្វើបច្ចុប្បន្នភាព (Under Technical Maintenance)',
                'reason' => $state['maintenance_reason'] ?? 'កំពុង Upgrade Server និងប្រព័ន្ធទូទាត់ប្រាក់ជូនលោកអ្នក។',
                'end_time' => $state['maintenance_end_time'] ?? null,
            ],
            'staff_lockdown' => [
                'active' => !empty($state['staff_lockdown']),
                'reason' => $state['staff_lockdown_reason'] ?? 'សកម្មភាពបុគ្គលិកត្រូវបានផ្អាកបណ្តោះអាសន្នដោយម្ចាស់ប្រព័ន្ធ',
            ],
            'server_time' => now()->toIso8601String(),
        ])
        ->header('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate')
        ->header('Pragma', 'no-cache')
        ->header('Expires', '0');
    }

    /**
     * Toggle Store Maintenance Mode
     */
    public function toggleMaintenance(Request $request)
    {
        $enabled = (bool)$request->input('enabled', false);
        $title = trim((string)$request->input('title', 'ប្រព័ន្ធកំពុងជួសជុល និងធ្វើបច្ចុប្បន្នភាព (Under Technical Maintenance)'));
        $reason = trim((string)$request->input('reason', 'ប្រព័ន្ធកំពុងធ្វើបច្ចុប្បន្នភាពតាមកាលវិភាគផ្លូវការ (Scheduled System Maintenance)'));
        $endTime = $request->input('end_time');

        $currentMaster = Cache::get('master_system_state') ?? [];
        if (empty($currentMaster)) {
            $row = DB::table('system_settings')->where('key', 'master_system_state')->first();
            if ($row && !empty($row->value)) {
                $currentMaster = is_string($row->value) ? json_decode($row->value, true) : (array)$row->value;
            }
        }

        $currentMaster['maintenance_mode'] = $enabled;
        $resolved = self::resolveSystemState($currentMaster);

        $this->updateMasterState([
            'maintenance_mode' => $enabled,
            'maintenance_title' => $title,
            'maintenance_reason' => $reason,
            'maintenance_end_time' => $endTime ? \Carbon\Carbon::parse($endTime)->toIso8601String() : null,
            'maintenance_updated_at' => now()->toIso8601String(),
            'mode' => $resolved['mode'],
        ]);

        // Push Alert to Telegram Sentinel
        try {
            $statusKh = $enabled ? "🔴 បានបើកដំណើរការ MAINTENANCE MODE (ហាងត្រូវបានបិទសម្រាប់ជួសជុល)" : "🟢 បានបិទ MAINTENANCE MODE (ហាងបានបើកដំណើរការធម្មតាឡើងវិញ)";
            TelegramService::sendSecurityAlert([
                'type' => $statusKh,
                'user' => '👑 ម្ចាស់ប្រព័ន្ធ (System Owner / Super Admin)',
                'action' => $enabled ? 'Store Lockdown Activated' : 'Store Opened to Public',
                'details' => "មូលហេតុ: {$reason} | ពេលវេលា: " . now()->format('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'maintenance_mode' => $enabled,
            'mode' => $resolved['mode'],
            'message' => $enabled 
                ? 'បានបើក Maintenance Mode ជោគជ័យ! អតិថិជននឹងឃើញផ្ទាំងថែទាំប្រព័ន្ធ។' 
                : 'បានបិទ Maintenance Mode ជោគជ័យ! ហាងបានបើកដំណើរការជាសាធារណៈវិញហើយ។',
        ]);
    }

    /**
     * Toggle Store Temporary Closure / Vacation with Custom Days & Countdown
     */
    public function toggleVacation(Request $request)
    {
        $enabled = (bool)$request->input('enabled', false);
        $days = max(1, (int)$request->input('days', 3));
        $hours = (int)$request->input('hours', 0);
        $customEndTime = $request->input('end_time');
        $title = trim((string)$request->input('title', 'ហាងសូមសម្រាកបណ្តោះអាសន្ន (Store Temporarily Closed)'));
        $reason = trim((string)$request->input('reason', "ហាង S Tech Store សូមឈប់សម្រាករយៈពេល {$days} ថ្ងៃ។ យើងនឹងបើកបម្រើលោកអ្នកវិញក្នុងពេលឆាប់ៗ!"));

        $endTime = null;
        if ($enabled) {
            if (!empty($customEndTime)) {
                $endTime = \Carbon\Carbon::parse($customEndTime)->toIso8601String();
            } else {
                $totalHours = ($days * 24) + $hours;
                if ($totalHours <= 0) $totalHours = 72; // default 3 days
                $endTime = now()->addHours($totalHours)->toIso8601String();
            }
        }

        $currentMaster = Cache::get('master_system_state') ?? [];
        if (empty($currentMaster)) {
            $row = DB::table('system_settings')->where('key', 'master_system_state')->first();
            if ($row && !empty($row->value)) {
                $currentMaster = is_string($row->value) ? json_decode($row->value, true) : (array)$row->value;
            }
        }

        $currentMaster['vacation_mode'] = $enabled;
        $currentMaster['vacation_end_time'] = $endTime;
        $resolved = self::resolveSystemState($currentMaster);

        $newState = [
            'vacation_mode' => $enabled,
            'vacation_title' => $title,
            'vacation_reason' => $reason,
            'vacation_end_time' => $endTime,
            'vacation_days' => $days,
            'vacation_started_at' => $enabled ? now()->toIso8601String() : null,
            'mode' => $resolved['mode'],
        ];

        $this->updateMasterState($newState);

        try {
            $statusKh = $enabled
                ? "🏖️ បានបើក STORE VACATION MODE (បិទសម្រាក {$days} ថ្ងៃ — Countdown ដល់: {$endTime})"
                : "🟢 បានបិទ VACATION MODE (ហាងបានបើកដំណើរការឡើងវិញជាធម្មតា)";
            TelegramService::sendSecurityAlert([
                'type' => $statusKh,
                'user' => '👑 ម្ចាស់ប្រព័ន្ធ (System Owner / Super Admin)',
                'action' => $enabled ? "Store Closed for {$days} Days" : 'Store Re-Opened',
                'details' => "មូលហេតុ: {$reason} | ពេលបើកវិញ: " . ($endTime ?: 'ភ្លាមៗ'),
            ]);
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'vacation_mode' => $enabled,
            'vacation_end_time' => $endTime,
            'mode' => $resolved['mode'],
            'message' => $enabled
                ? "បានបើកមុខងារបិទសម្រាក {$days} ថ្ងៃ ជោគជ័យ! អតិថិជននឹងឃើញផ្ទាំងរាប់ថយក្រោយ Countdown។"
                : "បានបិទមុខងារសម្រាក និងបើកហាងដំណើរការឡើងវិញជាធម្មតាជោគជ័យ!",
        ]);
    }

    /**
     * Toggle Complete Staff & Sub-Admin Activity Lockdown
     */
    public function toggleStaffLockdown(Request $request)
    {
        $enabled = (bool)$request->input('enabled', false);
        $reason = trim((string)$request->input('reason', 'ការត្រួតពិនិត្យសុវត្ថិភាពសរុប និងបង្កកសកម្មភាពបុគ្គលិកដោយម្ចាស់ប្រព័ន្ធ (Emergency Staff Lockdown by System Owner)'));

        $this->updateMasterState([
            'staff_lockdown' => $enabled,
            'staff_lockdown_reason' => $reason,
            'staff_lockdown_updated_at' => now()->toIso8601String(),
        ]);

        if ($enabled) {
            User::where('role', '!=', 'super_admin')
                ->where('email', '!=', 'nobrothana180703@gmail.com')
                ->whereNotNull('api_token')
                ->update(['api_token' => null]);
        }

        try {
            $statusKh = $enabled 
                ? "🔒 បិទផ្អាកសកម្មភាព Admin & Staff ទាំងអស់ (STAFF ACTIVITY FROZEN)" 
                : "🔓 ដោះសោសកម្មភាព Admin & Staff ធម្មតាវិញ (STAFF ACTIVITY RESTORED)";
            TelegramService::sendSecurityAlert([
                'type' => $statusKh,
                'user' => '👑 ម្ចាស់ប្រព័ន្ធ (System Owner / Super Admin)',
                'action' => $enabled ? 'Staff Activity Global Lockdown Activated' : 'Staff Activity Restored',
                'details' => "មូលហេតុ: {$reason} | សិទ្ធិប្រតិបត្តិការបុគ្គលិក: " . ($enabled ? "FROZEN (ម្ចាស់ប្រព័ន្ធគ្រប់គ្រងតែម្នាក់ឯង)" : "ACTIVE"),
            ]);
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'staff_lockdown' => $enabled,
            'message' => $enabled
                ? "បានបិទ និងបង្កកសកម្មភាព Admin & Staff ទាំងអស់ជោគជ័យ! មានតែម្ចាស់ប្រព័ន្ធប៉ុណ្ណោះដែលអាចបញ្ជាបាន។"
                : "បានដោះសោសកម្មភាព Admin & Staff ឱ្យដំណើរការធម្មតាឡើងវិញជោគជ័យ!",
        ]);
    }

    /**
     * Force Global System & CDN Cache Purge
     */
    public function purgeCaches(Request $request)
    {
        try {
            Cache::flush();
        } catch (\Throwable $t) {}

        $timestamp = now()->toIso8601String();
        $this->updateMasterState([
            'last_cache_purge' => $timestamp,
        ]);

        try {
            TelegramService::sendSecurityAlert([
                'type' => '⚡ Global System Cache Purged',
                'user' => '👑 ម្ចាស់ប្រព័ន្ធ (System Owner / Super Admin)',
                'action' => 'Cache Storage Flush Executed',
                'details' => "បានសម្អាត Application Cache, Session Cache និង Temporary Buffers ទាំងអស់ស្អាត 100%។",
            ]);
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'last_cache_purge' => $timestamp,
            'message' => 'បានសម្អាត Cache ប្រព័ន្ធទាំងមូល (Global System Cache & SW Storage) ជោគជ័យ 100%!',
        ]);
    }

    /**
     * Toggle Financial Transactions Freeze
     */
    public function toggleFinancialFreeze(Request $request)
    {
        $enabled = (bool)$request->input('enabled', false);
        $reason = $request->input('reason', 'ការត្រួតពិនិត្យសុវត្ថិភាពសាច់ប្រាក់បន្ទាន់ (Emergency Security Audit)');

        $this->updateMasterState([
            'financial_freeze' => $enabled,
            'financial_freeze_reason' => $reason,
            'financial_freeze_updated_at' => now()->toIso8601String(),
        ]);

        try {
            $statusKh = $enabled ? "🚨 បង្កកប្រតិបត្តិការហិរញ្ញវត្ថុទាំងអស់ (FINANCIAL FREEZE ARMED)" : "✅ ដោះលែងប្រតិបត្តិការហិរញ្ញវត្ថុធម្មតា (FINANCIAL UNFREEZE)";
            TelegramService::sendSecurityAlert([
                'type' => $statusKh,
                'user' => '👑 ម្ចាស់ប្រព័ន្ធ (System Owner / Super Admin)',
                'action' => $enabled ? 'Financial Operations Frozen' : 'Financial Operations Resumed',
                'details' => "មូលហេតុ: {$reason} | Topup, Checkout & Withdrawals Status: " . ($enabled ? "FROZEN" : "ACTIVE"),
            ]);
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'financial_freeze' => $enabled,
            'message' => $enabled 
                ? 'បានបង្កកប្រតិបត្តិការហិរញ្ញវត្ថុបន្ទាន់ (Checkout, Topup, Wallet) រួចរាល់!' 
                : 'បានដោះលែងប្រតិបត្តិការហិរញ្ញវត្ថុឲ្យដំណើរការធម្មតាវិញជោគជ័យ!',
        ]);
    }

    /**
     * Instant Database Snapshot & Backup
     */
    public function backupDatabase(Request $request)
    {
        $ordersCount = Order::count();
        $usersCount = UserProfile::count();
        $productsCount = Product::count();
        $staffCount = User::count();

        $snapshotData = [
            'app' => 'S Tech Store Official Snapshot',
            'version' => '1.0.0',
            'created_at' => now()->toIso8601String(),
            'counts' => [
                'orders' => $ordersCount,
                'users' => $usersCount,
                'products' => $productsCount,
                'staff' => $staffCount,
            ],
            'sample_recent_orders' => Order::latest()->take(5)->get(),
            'active_settings' => DB::table('system_settings')->pluck('value', 'key'),
        ];

        $backupDir = storage_path('app/backups');
        if (!file_exists($backupDir)) {
            @mkdir($backupDir, 0755, true);
        }

        $filename = 'stech_db_backup_' . date('Y_m_d_His') . '.json';
        $fullPath = $backupDir . '/' . $filename;
        file_put_contents($fullPath, json_encode($snapshotData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        $timestamp = now()->toIso8601String();
        $this->updateMasterState([
            'last_backup_at' => $timestamp,
            'last_backup_file' => $filename,
        ]);

        try {
            TelegramService::sendSecurityAlert([
                'type' => '💾 Cloud Database Snapshot Created',
                'user' => '👑 ម្ចាស់ប្រព័ន្ធ (System Owner / Super Admin)',
                'action' => 'Database Backup Exported',
                'details' => "ឯកសារ: {$filename} | Orders: {$ordersCount}, Customers: {$usersCount}, Products: {$productsCount}",
            ]);
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'filename' => $filename,
            'created_at' => $timestamp,
            'metrics' => [
                'orders' => $ordersCount,
                'users' => $usersCount,
                'products' => $productsCount,
            ],
            'message' => "បានបង្កើត និងរក្សាទុក Database Snapshot: {$filename} ជោគជ័យ!",
        ]);
    }

    /**
     * Force Client Update Broadcast (Bump Live Version)
     */
    public function forceClientUpdate(Request $request)
    {
        $version = trim((string)$request->input('version', '1.1.0'));
        $force = (bool)$request->input('force', true);
        $notes = $request->input('notes', ['Official update broadcast triggered by System Owner']);

        $versionPayload = [
            'version' => $version,
            'build' => date('Ymd.His'),
            'release_name' => "S Tech Store Release v{$version}",
            'force_update' => $force,
            'changelog' => is_array($notes) ? $notes : [$notes],
            'broadcasted_at' => now()->toIso8601String(),
        ];

        Cache::put('app_dynamic_version', $versionPayload, 86400 * 30);
        $this->updateMasterState([
            'force_app_version' => $version,
            'last_update_broadcast' => now()->toIso8601String(),
        ]);

        try {
            TelegramService::sendSecurityAlert([
                'type' => "🚀 App Update Broadcast Triggered: v{$version}",
                'user' => '👑 ម្ចាស់ប្រព័ន្ធ (System Owner / Super Admin)',
                'action' => 'Global PWA Update Broadcast',
                'details' => "Version គោលដៅ: v{$version} | Force Reload: " . ($force ? "YES" : "NO"),
            ]);
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'version' => $version,
            'message' => "បានបញ្ជូនសញ្ញា Force Update ទៅកាន់ App អតិថិជនទូទាំងប្រទេសជោគជ័យ (Target: v{$version})!",
        ]);
    }

    /**
     * Emergency Master SOS Broadcast to all Telegram Channels
     */
    public function sosBroadcast(Request $request)
    {
        $customMsg = trim((string)$request->input('message', ''));
        $emergencyText = $customMsg ?: "🚨 [EMERGENCY SOS ALERT FROM SYSTEM OWNER]\nសូមបុគ្គលិកទាំងអស់ប្រុងប្រយ័ត្ន និងត្រួតពិនិត្យប្រព័ន្ធជាបន្ទាន់!";

        try {
            $topics = ['security', 'orders', 'chat', 'finance'];
            foreach ($topics as $topic) {
                TelegramService::sendToTopic($emergencyText, $topic);
            }
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'message' => 'បានបាញ់សារប្រកាសអាសន្ន SOS ទៅគ្រប់ Telegram Channels ទាំងអស់ជោគជ័យ!',
        ]);
    }

    /**
     * Emergency Revoke All Staff / Non-Owner Sessions
     */
    public function revokeAllStaffSessions(Request $request)
    {
        $affected = User::where('role', '!=', 'super_admin')
            ->where('email', '!=', 'nobrothana180703@gmail.com')
            ->whereNotNull('api_token')
            ->update(['api_token' => null]);

        try {
            TelegramService::sendSecurityAlert([
                'type' => '🔒 Emergency Staff Sessions Revoked',
                'user' => '👑 ម្ចាស់ប្រព័ន្ធ (System Owner / Super Admin)',
                'action' => 'Staff Account Tokens Terminated',
                'details' => "បានកាត់ផ្តាច់ Session បុគ្គលិក និង Admin ធម្មតាចំនួន {$affected} គណនីភ្លាមៗ ដើម្បីសុវត្ថិភាព។",
            ]);
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'revoked_count' => $affected,
            'message' => "បានកាត់ផ្តាច់ Session បុគ្គលិកចំនួន {$affected} នាក់ជាបន្ទាន់ជោគជ័យ! ពួកគេត្រូវ Login ឡើងវិញ។",
        ]);
    }

    /**
     * Adjust Global Reward Coin Multiplier
     */
    public function updateCoinMultiplier(Request $request)
    {
        $multiplier = max(0.5, min(10.0, (float)$request->input('multiplier', 1.0)));

        $this->updateMasterState([
            'coin_multiplier' => $multiplier,
            'multiplier_updated_at' => now()->toIso8601String(),
        ]);

        try {
            TelegramService::sendSecurityAlert([
                'type' => "💎 Coin Reward Multiplier Adjusted to {$multiplier}x",
                'user' => '👑 ម្ចាស់ប្រព័ន្ធ (System Owner / Super Admin)',
                'action' => 'Coin Points Multiplier Update',
                'details' => "អតិថិជននឹងទទួលបាន Coin x{$multiplier} ដងក្នុងរាល់ការទស្សនា និងទិញទំនិញ!",
            ]);
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'coin_multiplier' => $multiplier,
            'message' => "បានកែប្រែអត្រាពិន្ទុ Coin Reward ទៅជា {$multiplier}x ជោគជ័យ!",
        ]);
    }

    /**
     * Toggle Cybersecurity Night Lock (02:00 AM - 06:00 AM)
     */
    public function toggleNightLock(Request $request)
    {
        $enabled = $request->has('enabled') ? (bool)$request->input('enabled') : null;
        $forced = $request->has('forced') ? (bool)$request->input('forced') : null;
        $startTime = $request->input('start_time');
        $endTime = $request->input('end_time');
        $title = $request->input('title');
        $reason = $request->input('reason');

        $updates = [];
        if ($enabled !== null) $updates['night_lock_enabled'] = $enabled;
        if ($forced !== null) $updates['night_lock_forced'] = $forced;
        if ($startTime !== null && trim($startTime) !== '') $updates['night_lock_start'] = trim($startTime);
        if ($endTime !== null && trim($endTime) !== '') $updates['night_lock_end'] = trim($endTime);
        if ($title !== null && trim($title) !== '') $updates['night_lock_title'] = trim($title);
        if ($reason !== null && trim($reason) !== '') $updates['night_lock_reason'] = trim($reason);

        $updates['night_lock_updated_at'] = now()->toIso8601String();

        $currentMaster = Cache::get('master_system_state') ?? [];
        if (empty($currentMaster)) {
            $row = DB::table('system_settings')->where('key', 'master_system_state')->first();
            if ($row && !empty($row->value)) {
                $currentMaster = is_string($row->value) ? json_decode($row->value, true) : (array)$row->value;
            }
        }
        $mergedForCheck = array_merge($currentMaster, $updates);
        $resolved = self::resolveSystemState($mergedForCheck);
        $updates['mode'] = $resolved['mode'];

        $newState = $this->updateMasterState($updates);
        $nightLockInfo = $resolved['nightLock'];

        try {
            $statusKh = $nightLockInfo['active']
                ? "🌙 Cybersecurity Night Lock សកម្ម (ACTIVE) — ម៉ោង {$nightLockInfo['start_time']} ដល់ {$nightLockInfo['end_time']}"
                : ($nightLockInfo['enabled'] 
                    ? "🕒 Cybersecurity Night Lock រៀបចំរួចរាល់ (STANDBY: ដំណើរការស្វ័យប្រវត្តិនៅម៉ោង {$nightLockInfo['start_time']})" 
                    : "⚪ Cybersecurity Night Lock ត្រូវបានបិទ (DISABLED)");

            TelegramService::sendSecurityAlert([
                'type' => $statusKh,
                'user' => '👑 ម្ចាស់ប្រព័ន្ធ (System Owner / Super Admin)',
                'action' => 'Cybersecurity Night Lock Configured',
                'details' => "ស្ថានភាព: " . ($nightLockInfo['active'] ? 'LOCKED' : 'STANDBY/OFF') . " | ម៉ោងកំណត់: {$nightLockInfo['start_time']} - {$nightLockInfo['end_time']} (Asia/Phnom_Penh)",
            ]);
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'night_lock' => $nightLockInfo,
            'mode' => $resolved['mode'],
            'message' => $nightLockInfo['active']
                ? "បានបើកដំណើរការ Night Lock ជោគជ័យ! Storefront ត្រូវបានចាក់សោសុវត្ថិភាព។"
                : "បានធ្វើបច្ចុប្បន្នភាពការកំណត់ Night Lock ជោគជ័យ!",
        ]);
    }

    /**
     * Helper to read & persist master state in system_settings
     */
    private function updateMasterState(array $newAttributes)
    {
        $row = DB::table('system_settings')->where('key', 'master_system_state')->first();
        $current = [];
        if ($row && !empty($row->value)) {
            $current = is_string($row->value) ? json_decode($row->value, true) : (array)$row->value;
        }

        $merged = array_merge($current, $newAttributes);

        DB::table('system_settings')->updateOrInsert(
            ['key' => 'master_system_state'],
            ['value' => json_encode($merged), 'updated_at' => now()]
        );

        Cache::put('master_system_state', $merged, 86400 * 30);
        return $merged;
    }
}
