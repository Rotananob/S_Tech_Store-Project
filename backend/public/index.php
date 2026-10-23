<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request with Instant Zero-Latency Response Flush...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$request = Request::capture();
$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle($request);
$response->send();

// ⚡ ULTRA-FAST ZERO-LATENCY FLUSH:
// Delivers the HTTP response immediately to the client browser (0-50ms).
// Any terminating tasks (Telegram alerts, Gmail SMTP dispatch, activity logs)
// execute in the background so the user never waits on third-party APIs!
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
} elseif (!headers_sent()) {
    if (function_exists('ob_get_level')) {
        while (ob_get_level() > 0) {
            @ob_end_flush();
        }
    }
    @flush();
}

$kernel->terminate($request, $response);
