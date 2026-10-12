<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // In local dev allow all; in production restrict strictly to verified store domains
    'allowed_origins' => env('APP_ENV') === 'local'
        ? ['*']
        : array_filter(array_map('trim', explode(',', env('ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,https://www.s-tech-store.tech,https://s-tech-store.tech')))),

    'allowed_origins_patterns' => [
        '#^https?://.*\.s-tech-store\.tech$#',
        '#^https?://.*\.vercel\.app$#',
    ],

    'allowed_headers' => [
        'Content-Type',
        'X-Requested-With',
        'Authorization',
        'X-Admin-Token',
        'X-Admin-Role',
        'X-Firebase-UID',
        'X-Firebase-Email',
        'X-Firebase-Name',
        'X-Firebase-Photo',
        'X-Customer-Token',
        'X-Telegram-Bot-Api-Secret-Token',
        'Accept',
        'Origin',
    ],

    'exposed_headers' => [
        'X-Admin-Token',
        'X-Firebase-UID',
    ],

    'max_age' => 86400,

    'supports_credentials' => true,

];
