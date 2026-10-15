<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('telegram:poll {--timeout=15 : Long poll timeout in seconds}', function () {
    $timeout = (int)$this->option('timeout');
    $this->info("S Tech Store Telegram Bot Polling Worker started (timeout: {$timeout}s)...");

    while (true) {
        try {
            \App\Services\TelegramService::pollPendingUpdates($timeout);
        } catch (\Throwable $e) {
            $this->error("Poll error: " . $e->getMessage());
            sleep(2);
        }
        usleep(150000);
    }
})->purpose('Poll Telegram Bot updates continuously and auto-reply instantly in Telegram');

Artisan::command('telegram:radar-poll {pair_code} {--duration=90}', function ($pairCode) {
    $duration = (int)$this->option('duration') ?: 90;
    $start = time();
    $this->info("Telegram Radar Poller started for pair code: {$pairCode}");

    while ((time() - $start) < $duration) {
        $settings = \App\Services\TelegramService::getSettings();
        $tokens = $settings['pending_tokens'] ?? [];

        // If pair code was already paired and topics exist, finish early
        if (!empty($settings['connected']) && !isset($tokens[$pairCode]) && !empty($settings['topics'])) {
            $this->info("Pairing and topics verified!");
            return;
        }

        try {
            \App\Services\TelegramService::pollPendingUpdates(0);
        } catch (\Throwable $e) {}

        // Check if THIS specific pair code has now been paired and connected
        $settings = \App\Services\TelegramService::getSettings();
        $tokens = $settings['pending_tokens'] ?? [];
        if (!isset($tokens[$pairCode]) && !empty($settings['connected']) && !empty($settings['chat_id'])) {
            // Guarantee topics are created and auto-healed in Telegram immediately
            \App\Services\TelegramService::setupTopics($settings['chat_id']);
            $this->info("Group connected with pair code {$pairCode} & topics auto-created in Telegram!");
            return;
        }

        sleep(1);
    }
})->purpose('Autonomous background radar poller for 1-click group pairing and topic creation');

Artisan::command('telegram:sync-db', function () {
    $settings = \App\Services\TelegramService::getSettings();
    \App\Services\TelegramService::saveSettings($settings);
    $this->info("Telegram settings synced successfully!");
    $this->line(json_encode($settings, JSON_PRETTY_PRINT));
})->purpose('Sync Telegram Bot settings to database');

Artisan::command('telegram:test', function () {
    $res = \App\Services\TelegramService::sendTestNotification();
    $this->line(json_encode($res, JSON_PRETTY_PRINT));
})->purpose('Send test notification via Telegram bot');

Artisan::command('telegram:setup-topics', function () {
    $settings = \App\Services\TelegramService::getSettings();
    if (empty($settings['chat_id'])) {
        $this->error("No chat connected");
        return;
    }
    $res = \App\Services\TelegramService::setupTopics($settings['chat_id']);
    $this->info("Topics setup finished!");
    $this->line(json_encode($res, JSON_PRETTY_PRINT));
})->purpose('Setup forum topics in connected Telegram group');

Artisan::command('telegram:test-security', function () {
    $sent = \App\Services\TelegramService::sendSecurityAlert([
        'type' => 'Test Security Rule Trigger (Rate Limit & Firewall Guard)',
        'ip' => '172.20.10.2',
        'device' => 'iPhone / Laptop Test Session',
        'user' => 'Rotana (Security Auditor)',
        'action' => 'Firewall Monitoring OK ✓',
        'details' => 'S Tech Store Anti-Spam Sentinel successfully initialized on forum thread 12.',
    ]);
    $this->info($sent ? "Security alert sent successfully!" : "Failed to send security alert");
})->purpose('Send test security alert to Telegram security topic');

// ── Autonomous 8:00 PM (Asia/Phnom_Penh) Report Scheduler ──
\Illuminate\Support\Facades\Schedule::call(function () {
    \App\Services\TelegramService::checkAndTriggerScheduledReports();
})->everyTenMinutes()->name('telegram-scheduled-reports');

Artisan::command('telegram:daily-report {--date= : Custom target date (YYYY-MM-DD)}', function () {
    $date = $this->option('date');
    $this->info("Triggering Daily Business Report for " . ($date ?: 'today') . "...");
    $res = \App\Services\TelegramService::sendDailyReport($date);
    $this->line(json_encode($res, JSON_PRETTY_PRINT));
})->purpose('Send rich daily business summary report to Telegram group');

Artisan::command('telegram:weekly-report', function () {
    $this->info("Triggering Weekly Sales & Product Breakdown Report...");
    $res = \App\Services\TelegramService::sendWeeklyReport();
    $this->line(json_encode($res, JSON_PRETTY_PRINT));
})->purpose('Send rich weekly product sales breakdown report to Telegram group');

Artisan::command('telegram:scan-stock {--threshold=3 : Low stock threshold}', function () {
    $threshold = (int)$this->option('threshold') ?: 3;
    $this->info("Scanning products with stock <= {$threshold}...");
    $res = \App\Services\TelegramService::scanAndAlertLowStock($threshold);
    $this->line(json_encode($res, JSON_PRETTY_PRINT));
})->purpose('Scan and send Telegram alerts for products running low on stock');

Artisan::command('admin:rotate-credentials', function () {
    $this->info("Rotating and securing all administrative passwords across Super Admin, Admin, and Staff...");

    $ownerPassword = env('ADMIN_OWNER_PASSWORD', 'ST#Sup3r0wn3r!9876^Rotana$Omega*2026#');
    $adminPassword = env('ADMIN_PASSWORD', 'ST#Adm1n_9284$Secure%Nexus&2026!');
    $staffPassword = env('STAFF_PASSWORD', 'ST#St@ff_7163^Shift*Duty@2026!');

    // 1. Super Admin Accounts
    $ownerEmails = [
        'nobrothana180703@gmail.com',
        'owner@stechstore.com',
        'rotananob@gmail.com',
    ];

    foreach ($ownerEmails as $email) {
        $user = \App\Models\User::updateOrCreate(
            ['email' => $email],
            [
                'name' => 'Rotana Nob (System Owner)',
                'password' => \Illuminate\Support\Facades\Hash::make($ownerPassword, ['rounds' => 12]),
                'role' => 'super_admin',
                'branch' => 'Phnom Penh Main Branch (សាខាកណ្តាល)',
                'shift' => 'Full-Time Shift (វេនពេញម៉ោង)',
                'status' => 'active',
                'phone' => '+855 12 888 999',
                'permissions' => ['*'],
                'api_token' => bin2hex(random_bytes(32)),
            ]
        );

        \App\Models\UserProfile::updateOrCreate(
            ['email' => $email],
            [
                'firebase_uid' => 'OWNER_ROOT_' . md5($email),
                'display_name' => 'Rotana Nob (System Owner)',
                'is_admin' => true,
                'phone' => '+855 12 888 999',
            ]
        );
        $this->line("Super Admin rotated: {$email}");
    }

    // 2. Standard Admin Account
    \App\Models\User::updateOrCreate(
        ['email' => 'admin@stechstore.com'],
        [
            'name' => 'S Tech Admin',
            'password' => \Illuminate\Support\Facades\Hash::make($adminPassword, ['rounds' => 12]),
            'role' => 'admin',
            'branch' => 'Phnom Penh Main Branch (សាខាកណ្តាល)',
            'shift' => 'Full-Time Shift (វេនពេញម៉ោង)',
            'status' => 'active',
            'phone' => '+855 12 888 999',
            'permissions' => ['all', 'manage_products', 'manage_orders', 'manage_staff', 'manage_branches', 'manage_shifts', 'manage_promotions', 'system_settings', 'financial_reports'],
            'api_token' => bin2hex(random_bytes(32)),
        ]
    );
    \App\Models\UserProfile::updateOrCreate(
        ['email' => 'admin@stechstore.com'],
        [
            'firebase_uid' => 'ADMIN_SYSTEM_' . md5('admin@stechstore.com'),
            'display_name' => 'S Tech Admin',
            'is_admin' => true,
            'phone' => '+855 12 888 999',
        ]
    );
    $this->line("Admin rotated: admin@stechstore.com");

    // 3. Staff Account
    \App\Models\User::updateOrCreate(
        ['email' => 'staff@stechstore.com'],
        [
            'name' => 'S Tech Operations Staff',
            'password' => \Illuminate\Support\Facades\Hash::make($staffPassword, ['rounds' => 12]),
            'role' => 'staff',
            'branch' => 'Phnom Penh Main Branch (សាខាកណ្តាល)',
            'shift' => 'Morning Shift (វេនព្រឹក)',
            'status' => 'active',
            'phone' => '+855 77 666 555',
            'permissions' => ['manage_products', 'manage_orders', 'view_inventory', 'customer_service', 'process_repairs'],
            'api_token' => bin2hex(random_bytes(32)),
        ]
    );
    \App\Models\UserProfile::updateOrCreate(
        ['email' => 'staff@stechstore.com'],
        [
            'firebase_uid' => 'STAFF_SYSTEM_' . md5('staff@stechstore.com'),
            'display_name' => 'S Tech Operations Staff',
            'is_admin' => true,
            'phone' => '+855 77 666 555',
        ]
    );
    $this->line("Staff rotated: staff@stechstore.com");

    // Flush old sessions & cache
    \Illuminate\Support\Facades\Cache::flush();
    $this->info("Cache and legacy auth tokens flushed.");

    // Send Telegram Security Audit Alert
    try {
        \App\Services\TelegramService::sendSecurityAlert([
            'type' => 'Emergency Security Rotation (Credentials Overhaul)',
            'ip' => request()->ip() ?? 'Server CLI (Localhost)',
            'device' => 'System Security Console',
            'user' => 'System Owner (Security Enforcement)',
            'action' => 'ALL_CREDENTIALS_ROTATED',
            'details' => 'All Super Admin, Admin, and Staff passwords have been forcefully updated and hardened to 2026 Enterprise Security Standards.',
        ]);
    } catch (\Throwable $t) {}

    $this->info("All credentials successfully rotated and secured!");
})->purpose('Forcefully rotate and harden Super Admin, Admin, and Staff passwords');



