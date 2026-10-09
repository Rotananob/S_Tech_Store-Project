<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Payment Gateway Configuration (Cambodia KHQR, ABA PayWay, Visa/Mastercard)
    |--------------------------------------------------------------------------
    */

    'bakong' => [
        'merchant_id' => env('BAKONG_MERCHANT_ID', 's_tech_store@bkng'),
        'account_name' => env('BAKONG_ACCOUNT_NAME', 'S TECH STORE CO., LTD'),
        'merchant_city' => env('BAKONG_MERCHANT_CITY', 'Phnom Penh'),
        'currency' => env('BAKONG_CURRENCY', 'USD'), // 'USD' (840) or 'KHR' (116)
        'api_token' => env('BAKONG_API_TOKEN', ''),
        'api_url' => env('BAKONG_API_URL', 'https://api-bakong.nbc.gov.kh/v1'),
    ],

    'aba' => [
        'merchant_id' => env('ABA_PAYWAY_MERCHANT_ID', ''),
        'api_key' => env('ABA_PAYWAY_API_KEY', ''),
        'api_url' => env('ABA_PAYWAY_API_URL', 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase'),
        'check_url' => env('ABA_PAYWAY_CHECK_URL', 'https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/check-transaction'),
        'deeplink_base' => env('ABA_DEEPLINK_BASE', 'https://link.payway.com.kh'),
    ],

    'visa' => [
        'mode' => env('CARD_GATEWAY_MODE', 'sandbox'), // 'sandbox' or 'live'
        'stripe_public_key' => env('STRIPE_PUBLIC_KEY', ''),
        'stripe_secret_key' => env('STRIPE_SECRET_KEY', ''),
    ],

    'currency' => [
        'usd_to_khr_rate' => (int) env('USD_TO_KHR_RATE', 4060),
    ],
];
