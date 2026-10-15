<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        $middleware->append(\App\Http\Middleware\SecurityHeadersMiddleware::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->reportable(function (\Throwable $e) {
            // Ignore common client/HTTP expected exceptions
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException ||
                $e instanceof \Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException ||
                $e instanceof \Illuminate\Validation\ValidationException ||
                $e instanceof \Illuminate\Auth\AuthenticationException ||
                $e instanceof \Illuminate\Auth\Access\AuthorizationException) {
                return;
            }

            try {
                \App\Services\TelegramService::sendSystemErrorAlert([
                    'error' => $e->getMessage() ?: get_class($e),
                    'context' => get_class($e),
                    'file' => basename($e->getFile()) . ':' . $e->getLine(),
                    'actor' => request()->ip() ?? 'CLI/System',
                ]);
            } catch (\Throwable $t) {}
        });
    })->create();
