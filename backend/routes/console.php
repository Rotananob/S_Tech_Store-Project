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
