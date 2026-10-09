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

// Customer Live Chat Support Alert to Telegram
Route::post('/chat/request-agent', function (Request $request) {
    $validated = $request->validate([
        'name' => 'nullable|string|max:150',
        'phone' => 'nullable|string|max:50',
        'email' => 'nullable|string|max:150',
        'telegram' => 'nullable|string|max:100',
        'message' => 'nullable|string|max:2000',
        'product_name' => 'nullable|string|max:255',
    ]);

    $res = \App\Services\TelegramService::sendCustomerChatAlert($validated);
    return response()->json([
        'success' => true,
        'message' => 'Your request has been forwarded to our support team on Telegram! We will reach out shortly.',
        'telegram_result' => $res,
    ]);
});

// Admin & Staff Authentication (Login Form Only — Strictly No Public Registration)
Route::post('/admin/login', [AdminAuthController::class, 'login']);

// Firebase-authenticated Routes (uses X-Firebase-UID header)
// The UserController handles its own auth via getUid() method

// Profile
Route::get('/user/profile', [UserController::class, 'getProfile']);
Route::put('/user/profile', [UserController::class, 'updateProfile']);
Route::post('/user/profile/avatar', [UserController::class, 'uploadAvatar']);

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

// Customer Live Chat Request to Telegram
Route::post('/chat/request-agent', function (\Illuminate\Http\Request $request) {
    $data = $request->validate([
        'name' => 'nullable|string|max:100',
        'email' => 'nullable|string|max:100',
        'phone' => 'nullable|string|max:50',
        'telegram' => 'nullable|string|max:100',
        'message' => 'required|string|max:1000',
        'product_name' => 'nullable|string|max:200',
        'product_url' => 'nullable|string|max:500',
    ]);

    $result = \App\Services\TelegramService::sendCustomerChatAlert($data);
    return response()->json([
        'success' => true,
        'message' => 'Live chat request transmitted to Telegram on-duty staff',
        'telegram_result' => $result,
    ]);
});

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

    // Repairs & Maintenance Management (សេវាជួសជុល)
    Route::get('/admin/repairs', [\App\Http\Controllers\RepairController::class, 'index']);
    Route::post('/admin/repairs', [\App\Http\Controllers\RepairController::class, 'store']);
    Route::put('/admin/repairs/{id}', [\App\Http\Controllers\RepairController::class, 'update']);
    Route::delete('/admin/repairs/{id}', [\App\Http\Controllers\RepairController::class, 'destroy']);

    // Customer Users Management (គ្រប់គ្រងអតិថិជន)
    Route::get('/admin/users', [\App\Http\Controllers\UserController::class, 'index']);
    Route::patch('/admin/users/{id}/admin-status', [\App\Http\Controllers\UserController::class, 'updateAdminStatus']);
    Route::put('/admin/users/{id}/toggle-status', [\App\Http\Controllers\UserController::class, 'toggleStatus']);
    Route::post('/admin/users/{id}/reset-password', [\App\Http\Controllers\UserController::class, 'resetPassword']);
    Route::delete('/admin/users/{id}', [\App\Http\Controllers\UserController::class, 'destroy']);

    // Telegram Bot Integration (ABA Merchant Style)
    Route::get('/admin/telegram/status', [\App\Http\Controllers\TelegramController::class, 'status']);
    Route::post('/admin/telegram/generate-link', [\App\Http\Controllers\TelegramController::class, 'generateLink']);
    Route::post('/admin/telegram/pair', [\App\Http\Controllers\TelegramController::class, 'pair']);
    Route::post('/admin/telegram/test', [\App\Http\Controllers\TelegramController::class, 'test']);
    Route::post('/admin/telegram/setup-topics', [\App\Http\Controllers\TelegramController::class, 'setupTopics']);
    Route::post('/admin/telegram/disconnect', [\App\Http\Controllers\TelegramController::class, 'disconnect']);
    Route::post('/admin/telegram/settings', [\App\Http\Controllers\TelegramController::class, 'updateSettings']);
    Route::post('/admin/telegram/broadcast', [\App\Http\Controllers\TelegramController::class, 'broadcast']);
});

// Public Telegram Webhook Endpoint
Route::post('/telegram/webhook', [\App\Http\Controllers\TelegramController::class, 'webhook']);
