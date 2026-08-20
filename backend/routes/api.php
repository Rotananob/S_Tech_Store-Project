<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\UserController;
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

// Protected Routes (Require Authentication)
Route::middleware('auth:sanctum')->group(function () {
    
    // Profile
    Route::get('/profile', [UserController::class, 'getProfile']);
    Route::put('/profile', [UserController::class, 'updateProfile']);

    // Notifications
    Route::get('/notifications', [UserController::class, 'getNotifications']);
    Route::post('/notifications', [UserController::class, 'createNotification']);
    Route::put('/notifications/read-all', [UserController::class, 'markAllNotificationsRead']);
    Route::put('/notifications/{id}/read', [UserController::class, 'markNotificationRead']);
    Route::delete('/notifications', [UserController::class, 'clearNotifications']);

    // Wishlist
    Route::get('/wishlist', [UserController::class, 'getWishlist']);
    Route::post('/wishlist', [UserController::class, 'addToWishlist']);
    Route::delete('/wishlist/{productId}', [UserController::class, 'removeFromWishlist']);

    // Cart
    Route::get('/cart', [UserController::class, 'getCart']);
    Route::post('/cart', [UserController::class, 'addToCart']);
    Route::put('/cart/{productId}', [UserController::class, 'updateCartItem']);
    Route::delete('/cart/{productId}', [UserController::class, 'removeFromCart']);
    Route::delete('/cart', [UserController::class, 'clearCart']);

    // User Orders
    Route::get('/user/orders', [UserController::class, 'getUserOrders']);
    Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:orders');

    // Admin Routes
    Route::middleware(AdminMiddleware::class)->group(function () {
        Route::get('/admin/stats', [\App\Http\Controllers\AdminController::class, 'stats']);
        
        // Products Admin
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{id}', [ProductController::class, 'update']);
        Route::delete('/products/{id}', [ProductController::class, 'destroy']);
        
        // Orders Admin
        Route::get('/admin/orders', [OrderController::class, 'index']);
        Route::patch('/admin/orders/{id}', [OrderController::class, 'updateStatus']);
    });
});
