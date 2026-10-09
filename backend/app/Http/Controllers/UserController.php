<?php

namespace App\Http\Controllers;

use App\Models\UserProfile;
use App\Models\UserNotification;
use App\Models\Wishlist;
use App\Models\Order;
use App\Models\UserCartItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

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

    public function index()
    {
        $profiles = UserProfile::orderBy('created_at', 'desc')->get();
        
        $result = $profiles->map(function ($u) {
            $orders = Order::where(function ($q) use ($u) {
                if (!empty($u->firebase_uid)) {
                    $q->where('user_id', $u->firebase_uid);
                }
                if (!empty($u->phone)) {
                    $q->orWhere('customer_phone', $u->phone);
                }
            })
            ->where('status', '!=', 'cancelled')
            ->get();

            return [
                'id' => $u->id,
                'firebase_uid' => $u->firebase_uid,
                'display_name' => $u->display_name ?: ('អតិថិជន #' . $u->id),
                'email' => $u->email,
                'photo_url' => $u->photo_url ?: $u->avatar_url,
                'phone' => $u->phone,
                'address' => $u->address,
                'city' => $u->city,
                'delivery_notes' => $u->delivery_notes,
                'gps_lat' => $u->gps_lat,
                'gps_lng' => $u->gps_lng,
                'telegram' => $u->telegram,
                'profession' => $u->profession,
                'gender' => $u->gender,
                'birthday' => $u->birthday,
                'is_admin' => (bool)$u->is_admin,
                'is_active' => (bool)($u->is_active ?? true),
                'status' => $u->status ?? 'active',
                'points' => (int)($u->points ?? 0),
                'total_orders' => $orders->count(),
                'total_spent' => (float)$orders->sum('total_amount'),
                'created_at' => $u->created_at ? $u->created_at->toIso8601String() : null,
                'last_password_reset_at' => $u->last_password_reset_at ? $u->last_password_reset_at->toIso8601String() : null,
            ];
        });

        return response()->json($result);
    }

    public function toggleStatus(Request $request, $id)
    {
        $user = UserProfile::findOrFail($id);
        $newActive = !($user->is_active ?? true);
        $user->is_active = $newActive;
        $user->status = $newActive ? 'active' : 'disabled';
        $user->save();

        return response()->json([
            'success' => true,
            'message' => $newActive ? "បានបើកដំណើរការគណនី '{$user->display_name}' ឡើងវិញ" : "បានផ្អាកដំណើរការគណនី '{$user->display_name}' (Disabled)",
            'user' => $user,
        ]);
    }

    public function resetPassword(Request $request, $id)
    {
        $user = UserProfile::findOrFail($id);
        $user->last_password_reset_at = now();
        $user->save();

        if (!empty($user->firebase_uid)) {
            try {
                UserNotification::create([
                    'firebase_uid' => $user->firebase_uid,
                    'title' => '🔑 សំណើស្នើសុំកំណត់ពាក្យសម្ងាត់ឡើងវិញ',
                    'message' => 'Admin បានបង្កើតសំណើកំណត់ពាក្យសម្ងាត់ឡើងវិញជូនលោកអ្នក។ ប្រសិនបើលោកអ្នកមិនបានស្នើសុំទេ សូមទាក់ទងមកកាន់ហាងភ្លាមៗ។',
                    'type' => 'system',
                    'read' => false,
                ]);
            } catch (\Throwable $e) {}
        }

        return response()->json([
            'success' => true,
            'message' => "បានផ្ញើសំណើ Reset Password ទៅកាន់គណនី {$user->display_name} ជោគជ័យ!",
            'reset_time' => now()->toIso8601String(),
        ]);
    }

    public function destroy($id)
    {
        $user = UserProfile::findOrFail($id);
        $name = $user->display_name;
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => "បានលុបគណនី '{$name}' ដោយជោគជ័យ",
        ]);
    }

    public function updateAdminStatus(Request $request, $id)
    {
        $validated = $request->validate(['is_admin' => 'required|boolean']);
        $user = UserProfile::findOrFail($id);
        $user->update(['is_admin' => $validated['is_admin']]);
        return response()->json(['message' => 'Admin status updated', 'user' => $user]);
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
            'photo_url' => 'nullable|string',
            'telegram' => 'nullable|string|max:100',
            'profession' => 'nullable|string|max:150',
            'gender' => 'nullable|string|max:30',
            'birthday' => 'nullable|string|max:50',
            'delivery_notes' => 'nullable|string|max:1000',
            'gps_lat' => 'nullable|numeric',
            'gps_lng' => 'nullable|numeric',
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

    /**
     * POST /api/user/profile/avatar
     * Upload user avatar directly to Cloudinary with local storage fallback
     */
    public function uploadAvatar(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) return response()->json(['error' => 'Unauthorized'], 401);

        $uploadedUrl = null;

        if ($request->hasFile('avatar')) {
            $file = $request->file('avatar');
        } elseif ($request->hasFile('photo')) {
            $file = $request->file('photo');
        } elseif ($request->hasFile('image')) {
            $file = $request->file('image');
        } else {
            $file = null;
        }

        if ($file && $file->isValid()) {
            // 1. Attempt Cloudinary upload first
            try {
                $cloudUrl = config('cloudinary.cloud_url') ?: env('CLOUDINARY_URL');
                if ($cloudUrl && function_exists('cloudinary')) {
                    $result = cloudinary()->uploadApi()->upload($file->getRealPath(), [
                        'folder' => 'stech_store/avatars',
                        'resource_type' => 'image',
                        'transformation' => [
                            'width' => 400,
                            'height' => 400,
                            'crop' => 'fill',
                            'gravity' => 'face'
                        ]
                    ]);
                    $uploadedUrl = $result['secure_url'] ?? null;
                }
            } catch (\Throwable $e) {
                Log::warning('Cloudinary avatar upload error: ' . $e->getMessage());
            }

            // 2. Fallback to public storage
            if (!$uploadedUrl) {
                try {
                    $path = $file->store('avatars', 'public');
                    $uploadedUrl = asset('storage/' . $path);
                } catch (\Throwable $e) {
                    Log::error('Local storage avatar upload failed: ' . $e->getMessage());
                }
            }
        } elseif ($request->filled('photo_url')) {
            $uploadedUrl = $request->photo_url;
        }

        if (!$uploadedUrl) {
            return response()->json(['error' => 'No valid image file uploaded'], 400);
        }

        $profile = UserProfile::firstOrCreate(['firebase_uid' => $uid]);
        $profile->update(['photo_url' => $uploadedUrl]);

        return response()->json([
            'success' => true,
            'message' => 'Profile picture uploaded to Cloudinary successfully',
            'photo_url' => $uploadedUrl,
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
                    'id' => $c->id,
                    'product_id' => $c->product_id,
                    'quantity' => $c->quantity,
                    'product' => [
                        'id' => $c->product->id ?? $c->product_id,
                        'name' => $c->product->name ?? '',
                        'price' => $c->product->price ?? 0,
                        'sale_price' => $c->product->sale_price ?? null,
                        'image' => $c->product->image_url ?? '',
                    ]
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
