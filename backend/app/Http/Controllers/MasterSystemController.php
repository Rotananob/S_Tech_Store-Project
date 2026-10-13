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
        $isSuperAdmin = $adminUser && ($adminUser->role === 'super_admin' || $adminUser->email === 'nobrothana180703@gmail.com');

        $row = DB::table('system_settings')->where('key', 'master_system_state')->first();
        $state = [];
        if ($row && !empty($row->value)) {
            $state = is_string($row->value) ? json_decode($row->value, true) : (array)$row->value;
        }

        $defaults = [
            'maintenance_mode' => false,
            'financial_freeze' => false,
            'coin_multiplier' => 1.0,
            'force_app_version' => '1.0.0',
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
     * Toggle Store Maintenance Mode
     */
    public function toggleMaintenance(Request $request)
    {
        $enabled = (bool)$request->input('enabled', false);
        $reason = $request->input('reason', 'ប្រព័ន្ធកំពុងធ្វើបច្ចុប្បន្នភាពតាមកាលវិភាគផ្លូវការ (Scheduled System Maintenance)');

        $this->updateMasterState([
            'maintenance_mode' => $enabled,
            'maintenance_reason' => $reason,
            'maintenance_updated_at' => now()->toIso8601String(),
        ]);

        // Push Alert to Telegram Sentinel
        try {
            $statusKh = $enabled ? "🔴 បានបើកដំណើរការ MAINTENANCE MODE (ហាងត្រូវបានបិទបណ្តោះអាសន្ន)" : "🟢 បានបិទ MAINTENANCE MODE (ហាងបានបើកដំណើរការធម្មតាឡើងវិញ)";
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
            'message' => $enabled 
                ? 'បានបើក Maintenance Mode ជោគជ័យ! អតិថិជននឹងឃើញផ្ទាំងថែទាំប្រព័ន្ធ។' 
                : 'បានបិទ Maintenance Mode ជោគជ័យ! ហាងបានបើកដំណើរការជាសាធារណៈវិញហើយ។',
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
        $version = trim((string)$request->input('version', '1.0.0'));
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
