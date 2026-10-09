<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AdminAuthController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\ShiftController;
use App\Models\Category;
use App\Http\Middleware\AdminMiddleware;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public Routes
Route::get('/categories', function () {
    return response()->json(Category::withCount('products')->get());
});

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::get('/products/{id}/reviews', [\App\Http\Controllers\ProductReviewController::class, 'index']);
Route::post('/products/{id}/reviews', [\App\Http\Controllers\ProductReviewController::class, 'store']);

// Public Store Branches & Shifts (Read Only)
Route::get('/branches', [BranchController::class, 'index']);
Route::get('/shifts', [ShiftController::class, 'index']);

// Admin & Staff Authentication (Login Form Only — Strictly No Public Registration)
Route::post('/admin/login', [AdminAuthController::class, 'login']);

// Firebase-authenticated Routes (uses X-Firebase-UID header)
// The UserController handles its own auth via getUid() method

// Profile
Route::get('/user/profile', [UserController::class, 'getProfile']);
Route::put('/user/profile', [UserController::class, 'updateProfile']);

// Notifications
Route::get('/notifications', [UserController::class, 'getNotifications']);
Route::post('/notifications', [UserController::class, 'createNotification']);
Route::put('/notifications/read-all', [UserController::class, 'markAllNotificationsRead']);
Route::put('/notifications/{id}/read', [UserController::class, 'markNotificationRead']);
Route::delete('/notifications', [UserController::class, 'clearNotifications']);

Route::get('/user/notifications', [UserController::class, 'getNotifications']);
Route::post('/user/notifications', [UserController::class, 'createNotification']);
Route::put('/user/notifications/read-all', [UserController::class, 'markAllNotificationsRead']);
Route::put('/user/notifications/{id}/read', [UserController::class, 'markNotificationRead']);
Route::delete('/user/notifications', [UserController::class, 'clearNotifications']);

// Wishlist
Route::get('/wishlist', [UserController::class, 'getWishlist']);
Route::post('/wishlist', [UserController::class, 'addToWishlist']);
Route::delete('/wishlist/{productId}', [UserController::class, 'removeFromWishlist']);

Route::get('/user/wishlist', [UserController::class, 'getWishlist']);
Route::post('/user/wishlist', [UserController::class, 'addToWishlist']);
Route::delete('/user/wishlist/{productId}', [UserController::class, 'removeFromWishlist']);

// Cart
Route::get('/cart', [UserController::class, 'getCart']);
Route::post('/cart', [UserController::class, 'addToCart']);
Route::put('/cart/{productId}', [UserController::class, 'updateCartItem']);
Route::delete('/cart/{productId}', [UserController::class, 'removeFromCart']);
Route::delete('/cart', [UserController::class, 'clearCart']);

Route::get('/user/cart', [UserController::class, 'getCart']);
Route::post('/user/cart', [UserController::class, 'addToCart']);
Route::put('/user/cart/{productId}', [UserController::class, 'updateCartItem']);
Route::delete('/user/cart/{productId}', [UserController::class, 'removeFromCart']);
Route::delete('/user/cart', [UserController::class, 'clearCart']);

// User Orders
Route::get('/user/orders', [UserController::class, 'getUserOrders']);
Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:30,1');

// PC Builds
Route::get('/user/pc-builds', [\App\Http\Controllers\PcBuildController::class, 'index']);
Route::post('/user/pc-builds', [\App\Http\Controllers\PcBuildController::class, 'store']);
Route::delete('/user/pc-builds/{id}', [\App\Http\Controllers\PcBuildController::class, 'destroy']);

// Admin & Staff Protected Routes (Guarded by AdminMiddleware)
Route::middleware(AdminMiddleware::class)->group(function () {
    // Current Admin / Staff Profile & Session
    Route::get('/admin/me', [AdminAuthController::class, 'me']);
    Route::post('/admin/logout', [AdminAuthController::class, 'logout']);

    // Dashboard Overview Statistics
    Route::get('/admin/stats', [\App\Http\Controllers\AdminController::class, 'stats']);

    // Inventory & Products Management
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    // Order Fulfillment & Status Management
    Route::get('/admin/orders', [OrderController::class, 'index']);
    Route::patch('/admin/orders/{id}', [OrderController::class, 'updateStatus']);

    // Staff & Account Management (Admin Role Only)
    Route::get('/admin/staff', [AdminAuthController::class, 'staffList']);
    Route::post('/admin/staff', [AdminAuthController::class, 'createStaff']);
    Route::put('/admin/staff/{id}', [AdminAuthController::class, 'updateStaff']);
    Route::delete('/admin/staff/{id}', [AdminAuthController::class, 'deleteStaff']);

    // Branch Management (សាខាហាង)
    Route::get('/admin/branches', [BranchController::class, 'index']);
    Route::post('/admin/branches', [BranchController::class, 'store']);
    Route::put('/admin/branches/{id}', [BranchController::class, 'update']);
    Route::delete('/admin/branches/{id}', [BranchController::class, 'destroy']);

    // Shift & Schedule Management (វេនធ្វើការ)
    Route::get('/admin/shifts', [ShiftController::class, 'index']);
    Route::post('/admin/shifts', [ShiftController::class, 'store']);
    Route::put('/admin/shifts/{id}', [ShiftController::class, 'update']);
    Route::delete('/admin/shifts/{id}', [ShiftController::class, 'destroy']);

    // Promotions & Promo Codes
    Route::get('/promo-codes', [\App\Http\Controllers\PromoCodeController::class, 'index']);
    Route::post('/promo-codes', [\App\Http\Controllers\PromoCodeController::class, 'store']);
    Route::put('/promo-codes/{id}', [\App\Http\Controllers\PromoCodeController::class, 'update']);
    Route::delete('/promo-codes/{id}', [\App\Http\Controllers\PromoCodeController::class, 'destroy']);

    // Users
    Route::get('/admin/users', [\App\Http\Controllers\UserController::class, 'index']);
    Route::patch('/admin/users/{id}/admin-status', [\App\Http\Controllers\UserController::class, 'updateAdminStatus']);

    // Telegram Bot Integration (ABA Merchant Style)
    Route::get('/admin/telegram/status', [\App\Http\Controllers\TelegramController::class, 'status']);
    Route::post('/admin/telegram/generate-link', [\App\Http\Controllers\TelegramController::class, 'generateLink']);
    Route::post('/admin/telegram/pair', [\App\Http\Controllers\TelegramController::class, 'pair']);
    Route::post('/admin/telegram/test', [\App\Http\Controllers\TelegramController::class, 'test']);
    Route::post('/admin/telegram/setup-topics', [\App\Http\Controllers\TelegramController::class, 'setupTopics']);
    Route::post('/admin/telegram/disconnect', [\App\Http\Controllers\TelegramController::class, 'disconnect']);
    Route::post('/admin/telegram/settings', [\App\Http\Controllers\TelegramController::class, 'updateSettings']);
});

// Public Telegram Webhook Endpoint
Route::post('/telegram/webhook', [\App\Http\Controllers\TelegramController::class, 'webhook']);
