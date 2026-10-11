<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('telegram:poll {--timeout=15 : Long poll timeout in seconds}', function () {
    $timeout = (int)$this->option('timeout');
    $this->info("⚡ S Tech Store Telegram Bot Polling Worker started (timeout: {$timeout}s)...");

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

Artisan::command('telegram:sync-db', function () {
    $settings = \App\Services\TelegramService::getSettings();
    \App\Services\TelegramService::saveSettings($settings);
    $this->info("Telegram settings synced to Neon PostgreSQL successfully!");
    $this->line(json_encode($settings, JSON_PRETTY_PRINT));
})->purpose('Sync Telegram Bot settings to Neon PostgreSQL database');

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


