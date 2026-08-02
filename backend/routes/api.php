<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\UserController;
use App\Models\Category;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Categories API
Route::get('/categories', function () {
    return response()->json(Category::withCount('products')->get());
});

// Products API
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);
Route::post('/products', [ProductController::class, 'store']);
Route::put('/products/{id}', [ProductController::class, 'update']);
Route::delete('/products/{id}', [ProductController::class, 'destroy']);

// Orders API (Admin — all orders)
Route::get('/orders', [OrderController::class, 'index']);
Route::post('/orders', [OrderController::class, 'store']);

// ─── User-Scoped APIs (keyed by X-Firebase-UID header) ──────────────────────

// Profile
Route::get('/user/profile', [UserController::class, 'getProfile']);
Route::put('/user/profile', [UserController::class, 'updateProfile']);

// Notifications
Route::get('/user/notifications', [UserController::class, 'getNotifications']);
Route::post('/user/notifications', [UserController::class, 'createNotification']);
Route::put('/user/notifications/read-all', [UserController::class, 'markAllNotificationsRead']);
Route::put('/user/notifications/{id}/read', [UserController::class, 'markNotificationRead']);
Route::delete('/user/notifications', [UserController::class, 'clearNotifications']);

// Wishlist
Route::get('/user/wishlist', [UserController::class, 'getWishlist']);
Route::post('/user/wishlist', [UserController::class, 'addToWishlist']);
Route::delete('/user/wishlist/{productId}', [UserController::class, 'removeFromWishlist']);

// Cart
Route::get('/user/cart', [UserController::class, 'getCart']);
Route::post('/user/cart', [UserController::class, 'addToCart']);
Route::put('/user/cart/{productId}', [UserController::class, 'updateCartItem']);
Route::delete('/user/cart/{productId}', [UserController::class, 'removeFromCart']);
Route::delete('/user/cart', [UserController::class, 'clearCart']);

// User Orders (isolated per user)
Route::get('/user/orders', [UserController::class, 'getUserOrders']);
