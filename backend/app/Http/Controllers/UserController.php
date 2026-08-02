<?php

namespace App\Http\Controllers;

use App\Models\UserProfile;
use App\Models\UserNotification;
use App\Models\Wishlist;
use App\Models\Order;
use App\Models\UserCartItem;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * Extract firebase_uid from request header.
     * Every frontend request sends X-Firebase-UID header.
     */
    private function getUid(Request $request): ?string
    {
        return $request->header('X-Firebase-UID');
    }

    // ─── Profile ────────────────────────────────────────────────────────────────

    /**
     * GET /api/user/profile
     * Returns the user's profile. Auto-creates if first visit.
     */
    public function getProfile(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $profile = UserProfile::firstOrCreate(
            ['firebase_uid' => $uid],
            [
                'display_name' => $request->header('X-Firebase-Name', ''),
                'email' => $request->header('X-Firebase-Email', ''),
                'photo_url' => $request->header('X-Firebase-Photo', ''),
            ]
        );

        // Count real stats
        $orderCount = Order::where('user_id', $uid)->count();
        $wishlistCount = Wishlist::where('firebase_uid', $uid)->count();
        $unreadNotifCount = UserNotification::where('firebase_uid', $uid)->where('read', false)->count();

        return response()->json([
            'profile' => $profile,
            'stats' => [
                'orders' => $orderCount,
                'wishlist' => $wishlistCount,
                'points' => $profile->points,
                'unread_notifications' => $unreadNotifCount,
            ],
        ]);
    }

    /**
     * PUT /api/user/profile
     * Update profile info.
     */
    public function updateProfile(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $validated = $request->validate([
            'display_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'two_fa_enabled' => 'nullable|boolean',
            'notif_orders' => 'nullable|boolean',
            'notif_promos' => 'nullable|boolean',
            'notif_builds' => 'nullable|boolean',
        ]);

        $profile = UserProfile::firstOrCreate(['firebase_uid' => $uid]);
        $profile->update($validated);

        // Create a notification for profile update
        UserNotification::create([
            'firebase_uid' => $uid,
            'title' => 'Profile Updated',
            'message' => 'Your profile settings have been saved successfully.',
            'type' => 'system',
        ]);

        return response()->json([
            'message' => 'Profile updated successfully',
            'profile' => $profile->fresh(),
        ]);
    }

    // ─── Notifications ──────────────────────────────────────────────────────────

    /**
     * GET /api/user/notifications
     */
    public function getNotifications(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $notifications = UserNotification::where('firebase_uid', $uid)
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return response()->json($notifications);
    }

    /**
     * POST /api/user/notifications
     */
    public function createNotification(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'nullable|string|in:welcome,login,promo,order,system',
        ]);

        $notification = UserNotification::create([
            'firebase_uid' => $uid,
            'title' => $validated['title'],
            'message' => $validated['message'],
            'type' => $validated['type'] ?? 'system',
        ]);

        return response()->json($notification, 201);
    }

    /**
     * PUT /api/user/notifications/{id}/read
     */
    public function markNotificationRead(Request $request, $id)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $notif = UserNotification::where('firebase_uid', $uid)->where('id', $id)->first();
        if (!$notif) return response()->json(['error' => 'Not found'], 404);

        $notif->update(['read' => true]);
        return response()->json(['message' => 'Marked as read']);
    }

    /**
     * PUT /api/user/notifications/read-all
     */
    public function markAllNotificationsRead(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        UserNotification::where('firebase_uid', $uid)->update(['read' => true]);
        return response()->json(['message' => 'All marked as read']);
    }

    /**
     * DELETE /api/user/notifications
     */
    public function clearNotifications(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        UserNotification::where('firebase_uid', $uid)->delete();
        return response()->json(['message' => 'All notifications cleared']);
    }

    // ─── Wishlist ────────────────────────────────────────────────────────────────

    /**
     * GET /api/user/wishlist
     */
    public function getWishlist(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $items = Wishlist::where('firebase_uid', $uid)
            ->with('product')
            ->get()
            ->map(function ($w) {
                return [
                    'id' => $w->product_id,
                    'name' => $w->product->name ?? '',
                    'price' => $w->product->price ?? 0,
                    'image' => $w->product->image_url ?? '',
                    'slug' => $w->product->slug ?? '',
                    'added_at' => $w->created_at,
                ];
            });

        return response()->json($items);
    }

    /**
     * POST /api/user/wishlist
     */
    public function addToWishlist(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
        ]);

        $wishlist = Wishlist::firstOrCreate([
            'firebase_uid' => $uid,
            'product_id' => $validated['product_id'],
        ]);

        return response()->json(['message' => 'Added to wishlist', 'item' => $wishlist], 201);
    }

    /**
     * DELETE /api/user/wishlist/{product_id}
     */
    public function removeFromWishlist(Request $request, $productId)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        Wishlist::where('firebase_uid', $uid)->where('product_id', $productId)->delete();
        return response()->json(['message' => 'Removed from wishlist']);
    }

    // ─── Shopping Cart (User-scoped DB) ─────────────────────────────────────────

    /**
     * GET /api/user/cart
     */
    public function getCart(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $items = UserCartItem::where('firebase_uid', $uid)
            ->with('product')
            ->get()
            ->map(function ($c) {
                return [
                    'id' => $c->product_id,
                    'name' => $c->product->name ?? '',
                    'price' => $c->product->price ?? 0,
                    'quantity' => $c->quantity,
                    'image_url' => $c->product->image_url ?? '',
                ];
            });

        return response()->json($items);
    }

    /**
     * POST /api/user/cart
     */
    public function addToCart(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'nullable|integer|min:1',
        ]);

        $qty = $validated['quantity'] ?? 1;

        $cartItem = UserCartItem::where('firebase_uid', $uid)
            ->where('product_id', $validated['product_id'])
            ->first();

        if ($cartItem) {
            $cartItem->increment('quantity', $qty);
        } else {
            $cartItem = UserCartItem::create([
                'firebase_uid' => $uid,
                'product_id' => $validated['product_id'],
                'quantity' => $qty,
            ]);
        }

        return response()->json(['message' => 'Added to cart', 'item' => $cartItem], 201);
    }

    /**
     * PUT /api/user/cart/{productId}
     */
    public function updateCartItem(Request $request, $productId)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $cartItem = UserCartItem::where('firebase_uid', $uid)
            ->where('product_id', $productId)
            ->first();

        if ($cartItem) {
            $cartItem->update(['quantity' => $validated['quantity']]);
            return response()->json(['message' => 'Quantity updated', 'item' => $cartItem]);
        }

        return response()->json(['error' => 'Item not found in cart'], 404);
    }

    /**
     * DELETE /api/user/cart/{productId}
     */
    public function removeFromCart(Request $request, $productId)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        UserCartItem::where('firebase_uid', $uid)->where('product_id', $productId)->delete();
        return response()->json(['message' => 'Removed from cart']);
    }

    /**
     * DELETE /api/user/cart
     */
    public function clearCart(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        UserCartItem::where('firebase_uid', $uid)->delete();
        return response()->json(['message' => 'Cart cleared']);
    }

    // ─── Orders (User-scoped) ───────────────────────────────────────────────────

    /**
     * GET /api/user/orders
     * Returns ONLY the current user's orders (complete isolation).
     */
    public function getUserOrders(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $orders = Order::where('user_id', $uid)
            ->with('items.product')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($orders);
    }
}
