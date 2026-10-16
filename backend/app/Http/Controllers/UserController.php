<?php

namespace App\Http\Controllers;

use App\Models\UserProfile;
use App\Models\UserNotification;
use App\Models\Wishlist;
use App\Models\Order;
use App\Models\UserCartItem;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class UserController extends Controller
{
    /**
     * Extract firebase_uid from request header.
     * Every frontend request sends X-Firebase-UID header.
     */
    private function getUid(Request $request): ?string
    {
        $uid = $request->header('X-Firebase-UID');
        if (!empty($uid)) {
            if (str_starts_with($uid, 'tg_')) {
                $cleanId = preg_replace('/\D/', '', $uid);
                $active = \App\Services\TelegramService::resolveActiveUser($cleanId);
                if ($active && !empty($active->firebase_uid)) {
                    return $active->firebase_uid;
                }
            }
            return $uid;
        }

        $chatId = $request->header('X-Telegram-Chat-ID') ?: $request->query('chat_id');
        if (!empty($chatId)) {
            $active = \App\Services\TelegramService::resolveActiveUser((string)$chatId);
            if ($active && !empty($active->firebase_uid)) {
                return $active->firebase_uid;
            }
            return 'tg_' . preg_replace('/\D/', '', $chatId);
        }

        $token = $request->header('X-Customer-Token')
            ?: $request->bearerToken()
            ?: $request->cookie('customer_token')
            ?: $request->query('token')
            ?: $request->query('tg_token');

        if (!empty($token)) {
            $userId = \Illuminate\Support\Facades\Cache::get("customer_sess_{$token}");
            $user = null;
            if ($userId) {
                $user = UserProfile::find($userId);
            }
            if (!$user) {
                $user = UserProfile::where('magic_login_token', $token)->first();
            }
            if ($user) {
                if (!empty($user->telegram_chat_id)) {
                    $active = \App\Services\TelegramService::resolveActiveUser((string)$user->telegram_chat_id);
                    if ($active) $user = $active;
                }
                if (empty($user->firebase_uid)) {
                    $user->firebase_uid = 'stech_u_' . $user->id;
                    $user->save();
                }
                return $user->firebase_uid;
            }
        }

        $email = $request->header('X-Firebase-Email');
        if (!empty($email)) {
            $user = UserProfile::where('email', $email)->first();
            if ($user && !empty($user->firebase_uid)) {
                return $user->firebase_uid;
            }
        }

        return null;
    }

    public function index(Request $request)
    {
        $search = trim((string)$request->input('search', ''));
        $roleFilter = trim((string)$request->input('role', 'all'));
        $statusFilter = trim((string)$request->input('status', 'all'));
        $page = max(1, (int)$request->input('page', 1));
        $perPage = max(1, (int)$request->input('per_page', 20));

        $rawProfiles = UserProfile::orderBy('created_at', 'desc')->get();

        // Safely deduplicate: prioritize real Gmail over tg_ dummy emails, and merge accounts sharing the same telegram_chat_id or identical email
        $profiles = $rawProfiles->groupBy(function($item) {
            $email = strtolower(trim((string)$item->email));
            $chatId = trim((string)$item->telegram_chat_id);
            $uid = trim((string)$item->firebase_uid);

            if (!empty($chatId) && (empty($email) || str_starts_with($email, 'tg_'))) {
                return 'tg_' . $chatId;
            }
            if (!empty($email)) {
                return 'email_' . $email;
            }
            if (!empty($chatId)) {
                return 'tg_' . $chatId;
            }
            if (!empty($uid)) {
                return 'uid_' . $uid;
            }
            return 'id_' . $item->id;
        })->map(function($group) {
            return $group->sortByDesc(function($item) {
                $hasRealEmail = (!empty($item->email) && !str_starts_with($item->email, 'tg_')) ? 10000 : 0;
                $isOwner = strtolower(trim($item->email ?? '')) === 'nobrothana180703@gmail.com' ? 50000 : 0;
                $isAdmin = $item->is_admin ? 20000 : 0;
                return $isOwner + $isAdmin + $hasRealEmail + ((float)($item->wallet_balance ?? 0) * 1000) + ((int)($item->points ?? 0) * 10) + (!empty($item->telegram_chat_id) ? 50 : 0);
            })->first();
        })->values();

        // Load internal users table to match staff & admin accounts
        $internalUsers = \App\Models\User::all()->keyBy(function($u) {
            return strtolower(trim($u->email));
        });

        // Preload orders count & spent
        $allOrders = Order::where('status', '!=', 'cancelled')->get();
        $ordersByUid = $allOrders->groupBy('user_id');
        $ordersByPhone = $allOrders->groupBy('customer_phone');

        $allAccounts = $profiles->map(function ($u) use ($internalUsers, $ordersByUid, $ordersByPhone) {
            $email = strtolower(trim((string)$u->email));
            $internal = $internalUsers->get($email);

            $isSystemOwner = ($email === 'nobrothana180703@gmail.com');

            $role = 'customer';
            if ($isSystemOwner) {
                $role = 'super_admin';
            } elseif ($internal && $internal->role === 'staff') {
                $role = 'staff';
            } elseif ($internal && in_array($internal->role, ['admin', 'super_admin'])) {
                $role = 'admin';
            } elseif ($email === 'staff@stechstore.com') {
                $role = 'staff';
            } elseif ($u->is_admin && $email !== 'nobrothana180703@gmail.com') {
                $role = 'admin';
            }

            $roleLabel = match($role) {
                'super_admin' => 'ម្ចាស់ប្រព័ន្ធ (System Owner)',
                'admin' => 'អ្នកគ្រប់គ្រង (Admin)',
                'staff' => 'បុគ្គលិក (Staff)',
                default => 'អតិថិជន (Customer)',
            };

            // Orders matching
            $matchedOrders = collect();
            if (!empty($u->firebase_uid) && $ordersByUid->has($u->firebase_uid)) {
                $matchedOrders = $matchedOrders->merge($ordersByUid->get($u->firebase_uid));
            }
            if (!empty($u->phone) && $ordersByPhone->has($u->phone)) {
                $matchedOrders = $matchedOrders->merge($ordersByPhone->get($u->phone));
            }
            $uniqueOrders = $matchedOrders->unique('id');

            // Authentication Channel Determination (Firebase Google vs Telegram Bot vs Linked)
            $hasRealEmail = !empty($u->email) && !str_starts_with($u->email, 'tg_') && str_contains($u->email, '@');
            $hasTelegramId = !empty($u->telegram_chat_id) || str_starts_with($u->firebase_uid ?? '', 'tg_') || (!empty($u->telegram) && $u->telegram !== 'N/A');

            $authChannel = 'firebase';
            $authChannelLabel = 'Firebase Google';
            if ($hasRealEmail && $hasTelegramId) {
                $authChannel = 'linked';
                $authChannelLabel = 'Linked (Web + Telegram)';
            } elseif ($hasTelegramId && !$hasRealEmail) {
                $authChannel = 'telegram';
                $authChannelLabel = 'Telegram Bot';
            }

            $isActive = (bool)($u->is_active ?? true);

            return [
                'id' => $u->id,
                'firebase_uid' => $u->firebase_uid,
                'display_name' => $u->display_name ?: ($isSystemOwner ? 'Rotana Nob (System Owner)' : ('អតិថិជន #' . $u->id)),
                'email' => $u->email,
                'photo_url' => $u->photo_url ?: $u->avatar_url,
                'phone' => $u->phone,
                'address' => $u->address,
                'city' => $u->city,
                'delivery_notes' => $u->delivery_notes,
                'gps_lat' => $u->gps_lat,
                'gps_lng' => $u->gps_lng,
                'telegram' => $u->telegram,
                'username' => $u->username ?: (!empty($u->telegram) ? $u->telegram : null),
                'telegram_chat_id' => $u->telegram_chat_id ?: (str_starts_with($u->firebase_uid ?? '', 'tg_') ? str_replace('tg_', '', $u->firebase_uid) : null),
                'has_telegram' => $hasTelegramId,
                'profession' => $u->profession,
                'gender' => $u->gender,
                'birthday' => $u->birthday,
                'role' => $role,
                'role_label' => $roleLabel,
                'auth_channel' => $authChannel,
                'auth_channel_label' => $authChannelLabel,
                'is_system_owner' => $isSystemOwner,
                'is_staff' => ($role === 'staff'),
                'is_admin' => ($role === 'admin' || $role === 'super_admin'),
                'is_customer' => ($role === 'customer'),
                'is_active' => $isActive,
                'status' => $isActive ? 'active' : 'disabled',
                'points' => (int)($u->points ?? 0),
                'wallet_balance' => (float)($u->wallet_balance ?? 0.00),
                'total_orders' => $uniqueOrders->count(),
                'total_spent' => (float)$uniqueOrders->sum('total_amount'),
                'created_at' => $u->created_at ? $u->created_at->toIso8601String() : null,
                'last_password_reset_at' => $u->last_password_reset_at ? $u->last_password_reset_at->toIso8601String() : null,
            ];
        });

        // ── 1. Calculate Exact Global Counts ──
        $customersList = $allAccounts->filter(fn($u) => $u['is_customer']);
        $staffList = $allAccounts->filter(fn($u) => $u['is_staff']);
        $adminsList = $allAccounts->filter(fn($u) => $u['is_admin']);

        $totalCustomers = $customersList->count();
        $totalStaff = $staffList->count();
        $totalAdmins = $adminsList->count();
        $totalAll = $allAccounts->count();

        $activeCustomers = $customersList->filter(fn($u) => $u['is_active'])->count();
        $activeStaff = $staffList->filter(fn($u) => $u['is_active'])->count();
        $activeAdmins = $adminsList->filter(fn($u) => $u['is_active'])->count();
        $activeTotal = $allAccounts->filter(fn($u) => $u['is_active'])->count();
        $disabledTotal = $totalAll - $activeTotal;

        $totalOrdersSum = $allAccounts->sum('total_orders');

        $channelFirebase = $allAccounts->filter(fn($u) => $u['auth_channel'] === 'firebase')->count();
        $channelTelegram = $allAccounts->filter(fn($u) => $u['auth_channel'] === 'telegram')->count();
        $channelLinked = $allAccounts->filter(fn($u) => $u['auth_channel'] === 'linked')->count();

        // If caller requested raw array without pagination (e.g. all=true or paginate=false)
        if ($request->query('all') === 'true' || $request->query('paginate') === 'false') {
            return response()->json($allAccounts->values());
        }

        // ── 2. Filter by Role Tab ──
        $filtered = $allAccounts;
        if ($roleFilter === 'customers') {
            $filtered = $filtered->filter(fn($u) => $u['is_customer']);
        } elseif ($roleFilter === 'staff') {
            $filtered = $filtered->filter(fn($u) => $u['is_staff']);
        } elseif ($roleFilter === 'admins') {
            $filtered = $filtered->filter(fn($u) => $u['is_admin']);
        }

        // ── 3. Filter by Status ──
        if ($statusFilter === 'active') {
            $filtered = $filtered->filter(fn($u) => $u['is_active']);
        } elseif ($statusFilter === 'disabled') {
            $filtered = $filtered->filter(fn($u) => !$u['is_active']);
        }

        // ── 4. Filter by Search Query (Name, Email, Phone, Telegram, City, ID) ──
        if (!empty($search)) {
            $q = strtolower($search);
            $filtered = $filtered->filter(function($u) use ($q) {
                return str_contains(strtolower($u['display_name'] ?? ''), $q)
                    || str_contains(strtolower($u['email'] ?? ''), $q)
                    || str_contains(strtolower($u['phone'] ?? ''), $q)
                    || str_contains(strtolower($u['telegram'] ?? ''), $q)
                    || str_contains(strtolower($u['username'] ?? ''), $q)
                    || str_contains(strtolower($u['city'] ?? ''), $q)
                    || str_contains((string)$u['id'], $q);
            });
        }

        $totalMatching = $filtered->count();
        $paginated = $filtered->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => $paginated,
            'total' => $totalMatching,
            'current_page' => $page,
            'per_page' => $perPage,
            'last_page' => max(1, (int)ceil($totalMatching / $perPage)),
            'counts' => [
                'customers' => $totalCustomers,
                'staff' => $totalStaff,
                'admins' => $totalAdmins,
                'all' => $totalAll,
                'active_customers' => $activeCustomers,
                'active_staff' => $activeStaff,
                'active_admins' => $activeAdmins,
                'active_total' => $activeTotal,
                'disabled_total' => $disabledTotal,
                'total_orders' => $totalOrdersSum,
                'channel_firebase' => $channelFirebase,
                'channel_telegram' => $channelTelegram,
                'channel_linked' => $channelLinked,
            ],
            // For backward compatibility:
            'users' => $paginated,
        ]);
    }

    public function toggleStatus(Request $request, $id)
    {
        $user = UserProfile::findOrFail($id);

        // System Owner immunity: no one can disable or alter the master owner account
        if (strtolower($user->email ?? '') === 'nobrothana180703@gmail.com') {
            return response()->json([
                'success' => false,
                'message' => 'មិនអាចផ្អាកដំណើរការគណនីម្ចាស់ប្រព័ន្ធ (System Owner) បានដាច់ខាត!',
            ], 403);
        }

        $newActive = !($user->is_active ?? true);
        $user->is_active = $newActive;
        $user->status = $newActive ? 'active' : 'disabled';
        $user->save();

        if (!$newActive) {
            // Immediately purge any cached sessions for this user so they cannot make authenticated requests
            $chatId = $user->telegram_chat_id;
            if (!$chatId && str_starts_with($user->firebase_uid ?? '', 'tg_')) {
                $chatId = str_replace('tg_', '', $user->firebase_uid);
            }
            if ($chatId) {
                \Illuminate\Support\Facades\Cache::forget("customer_sess_{$chatId}");
            }
            if (!empty($user->firebase_uid)) {
                \Illuminate\Support\Facades\Cache::forget("customer_sess_uid_{$user->firebase_uid}");
            }
            if (!empty($user->magic_login_token)) {
                $user->magic_login_token = null;
                $user->magic_token_expires_at = null;
                $user->save();
            }
        }

        return response()->json([
            'success' => true,
            'message' => $newActive ? "បានបើកដំណើរការគណនី '{$user->display_name}' ឡើងវិញដោយជោគជ័យ" : "បានផ្អាកដំណើរការគណនី '{$user->display_name}' ដោយជោគជ័យ",
            'user' => [
                'id' => $user->id,
                'is_active' => (bool)$user->is_active,
                'status' => $user->status,
            ],
        ]);
    }

    /**
     * POST /api/admin/users
     * Admin & Staff can create new customer accounts.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'display_name' => 'required|string|max:100',
            'email' => 'required|email|max:100|unique:user_profiles,email',
            'phone' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'profession' => 'nullable|string|max:100',
            'delivery_notes' => 'nullable|string|max:255',
            'points' => 'nullable|integer|min:0',
        ]);

        $profile = UserProfile::create([
            'firebase_uid' => 'stech_u_' . Str::random(12),
            'display_name' => trim($validated['display_name']),
            'email' => strtolower(trim($validated['email'])),
            'phone' => !empty($validated['phone']) ? trim($validated['phone']) : null,
            'address' => !empty($validated['address']) ? trim($validated['address']) : null,
            'city' => !empty($validated['city']) ? trim($validated['city']) : null,
            'profession' => !empty($validated['profession']) ? trim($validated['profession']) : null,
            'delivery_notes' => !empty($validated['delivery_notes']) ? trim($validated['delivery_notes']) : null,
            'points' => (int)($validated['points'] ?? 0),
            'is_active' => true,
            'status' => 'active',
            'is_admin' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => "បានបង្កើតគណនីអតិថិជន '{$profile->display_name}' ដោយជោគជ័យ",
            'user' => [
                'id' => $profile->id,
                'firebase_uid' => $profile->firebase_uid,
                'display_name' => $profile->display_name,
                'email' => $profile->email,
                'photo_url' => $profile->photo_url,
                'phone' => $profile->phone,
                'address' => $profile->address,
                'city' => $profile->city,
                'delivery_notes' => $profile->delivery_notes,
                'gps_lat' => null,
                'gps_lng' => null,
                'telegram' => null,
                'username' => null,
                'telegram_chat_id' => null,
                'has_telegram' => false,
                'profession' => $profile->profession,
                'gender' => null,
                'birthday' => null,
                'is_admin' => false,
                'is_active' => true,
                'status' => 'active',
                'points' => $profile->points,
                'total_orders' => 0,
                'total_spent' => 0.0,
                'created_at' => $profile->created_at ? $profile->created_at->toIso8601String() : now()->toIso8601String(),
                'last_password_reset_at' => null,
            ],
        ], 201);
    }

    /**
     * PUT /api/admin/users/{id}
     * Only Admin can edit customer accounts (Staff cannot edit).
     */
    public function update(Request $request, $id)
    {
        $authUser = $request->attributes->get('auth_user');
        $role = $authUser ? ($authUser->role ?? 'admin') : ($request->header('X-Admin-Role') ?: 'admin');

        if ($role === 'staff') {
            return response()->json([
                'success' => false,
                'message' => 'បុគ្គលិក (Staff) មិនមានសិទ្ធិកែប្រែគណនីអតិថិជនឡើយ! មានតែ Admin ប៉ុណ្ណោះដែលអាចកែប្រែបាន។',
            ], 403);
        }

        $user = UserProfile::findOrFail($id);

        if (strtolower($user->email ?? '') === 'nobrothana180703@gmail.com') {
            $callerEmail = strtolower($authUser ? ($authUser->email ?? '') : ($request->header('X-Admin-Email') ?: ''));
            if ($callerEmail !== 'nobrothana180703@gmail.com') {
                return response()->json([
                    'success' => false,
                    'message' => 'គ្មាននរណាមានសិទ្ធិកែប្រែគណនីម្ចាស់ប្រព័ន្ធ (System Owner) បានឡើយ!',
                ], 403);
            }
        }

        $validated = $request->validate([
            'display_name' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'profession' => 'nullable|string|max:100',
            'delivery_notes' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
            'status' => 'nullable|string|in:active,disabled',
            'points' => 'nullable|integer|min:0',
        ]);

        if (isset($validated['display_name'])) $user->display_name = trim($validated['display_name']);
        if (array_key_exists('phone', $validated)) $user->phone = !empty($validated['phone']) ? trim($validated['phone']) : null;
        if (array_key_exists('address', $validated)) $user->address = !empty($validated['address']) ? trim($validated['address']) : null;
        if (array_key_exists('city', $validated)) $user->city = !empty($validated['city']) ? trim($validated['city']) : null;
        if (array_key_exists('profession', $validated)) $user->profession = !empty($validated['profession']) ? trim($validated['profession']) : null;
        if (array_key_exists('delivery_notes', $validated)) $user->delivery_notes = !empty($validated['delivery_notes']) ? trim($validated['delivery_notes']) : null;
        if (isset($validated['is_active'])) {
            $user->is_active = (bool)$validated['is_active'];
            $user->status = $user->is_active ? 'active' : 'disabled';
        } elseif (isset($validated['status'])) {
            $user->status = $validated['status'];
            $user->is_active = $user->status === 'active';
        }
        if (isset($validated['points'])) $user->points = (int)$validated['points'];

        $user->save();

        return response()->json([
            'success' => true,
            'message' => "បានកែប្រែព័ត៌មានគណនី '{$user->display_name}' ដោយជោគជ័យ",
            'user' => [
                'id' => $user->id,
                'firebase_uid' => $user->firebase_uid,
                'display_name' => $user->display_name,
                'email' => $user->email,
                'photo_url' => $user->photo_url ?: $user->avatar_url,
                'phone' => $user->phone,
                'address' => $user->address,
                'city' => $user->city,
                'delivery_notes' => $user->delivery_notes,
                'profession' => $user->profession,
                'is_active' => (bool)$user->is_active,
                'status' => $user->status,
                'points' => (int)$user->points,
            ],
        ]);
    }

    /**
     * DELETE /api/admin/users/{id}
     * Admin only. Permanently deletes the account and wipes all Telegram bindings.
     */
    public function destroy(Request $request, $id)
    {
        $authUser = $request->attributes->get('auth_user');
        $role = $authUser ? ($authUser->role ?? 'admin') : ($request->header('X-Admin-Role') ?: 'admin');

        // 1. Staff cannot delete user accounts
        if ($role === 'staff') {
            return response()->json([
                'success' => false,
                'message' => 'បុគ្គលិក (Staff) មិនមានសិទ្ធិលុបគណនីអតិថិជនឡើយ! មានតែ Admin ប៉ុណ្ណោះដែលអាចលុបបាន។',
            ], 403);
        }

        $user = UserProfile::findOrFail($id);

        // 2. System Owner immunity: master account cannot be deleted by anyone!
        if (strtolower($user->email ?? '') === 'nobrothana180703@gmail.com') {
            return response()->json([
                'success' => false,
                'message' => 'មិនអាចលុបគណនីម្ចាស់ប្រព័ន្ធ (System Owner) បានដាច់ខាត!',
            ], 403);
        }

        $displayName = $user->display_name ?: ('អតិថិជន #' . $user->id);
        $email = $user->email;
        $firebaseUid = $user->firebase_uid;
        $magicToken = $user->magic_login_token;
        $chatId = $user->telegram_chat_id;
        if (!$chatId && str_starts_with($firebaseUid ?? '', 'tg_')) {
            $chatId = str_replace('tg_', '', $firebaseUid);
        }

        // 3. Purge all Telegram sessions, handshakes, and linkage cache
        if ($chatId) {
            \Illuminate\Support\Facades\Cache::forget("customer_sess_{$chatId}");
            \Illuminate\Support\Facades\Cache::forget("welcomed_tg_{$chatId}");
            \Illuminate\Support\Facades\Cache::forget("tg_handshake_{$chatId}");
        }
        if ($firebaseUid) {
            \Illuminate\Support\Facades\Cache::forget("customer_sess_uid_{$firebaseUid}");
            \Illuminate\Support\Facades\Cache::forget("tg_link_code_uid_{$firebaseUid}");
            \Illuminate\Support\Facades\Cache::forget("customer_profile_{$firebaseUid}");
        }
        if ($magicToken) {
            \Illuminate\Support\Facades\Cache::forget("magic_token_{$magicToken}");
        }

        try {
            if ($chatId) {
                \Illuminate\Support\Facades\DB::table('system_settings')->where('key', 'like', "%{$chatId}%")->delete();
            }
            if ($firebaseUid) {
                \Illuminate\Support\Facades\DB::table('system_settings')->where('key', 'like', "%{$firebaseUid}%")->delete();
            }
        } catch (\Throwable $e) {}

        // 4. Cascade delete associated user cart items, wishlists, and notifications
        try {
            if ($firebaseUid) {
                \App\Models\UserCartItem::where('firebase_uid', $firebaseUid)->delete();
                \App\Models\Wishlist::where('firebase_uid', $firebaseUid)->delete();
                \App\Models\UserNotification::where('firebase_uid', $firebaseUid)->delete();
            }
        } catch (\Throwable $e) {}

        // 5. Delete corresponding User record in users table if exists (and not owner)
        if ($email && strtolower($email) !== 'nobrothana180703@gmail.com') {
            try {
                \App\Models\User::where('email', strtolower($email))->where('role', '!=', 'super_admin')->delete();
            } catch (\Throwable $e) {}
        }

        // 6. Delete UserProfile permanently from Database
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => "បានលុបគណនី '{$displayName}' និងផ្តាច់ការភ្ជាប់ Telegram ទាំងអស់ដោយជោគជ័យ",
            'deleted_id' => (int)$id,
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

    public function generateMagicLink(Request $request, $id)
    {
        $user = UserProfile::findOrFail($id);

        if (!($user->is_active ?? true)) {
            return response()->json([
                'success' => false,
                'message' => "គណនី '{$user->display_name}' ត្រូវបានផ្អាកដំណើរការបណ្ដោះអាសន្ន។ មិនអាចបង្កើត Magic Link បានទេ។",
            ], 403);
        }

        if (empty($user->firebase_uid)) {
            $user->firebase_uid = 'stech_u_' . $user->id . '_' . Str::random(10);
        }

        $token = Str::random(60);
        $user->magic_login_token = $token;
        $user->magic_token_expires_at = now()->addHours(24);
        $user->last_password_reset_at = now();
        $user->save();

        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
        $origin = $request->header('Origin') ?: $request->header('Referer');
        if ($origin) {
            $parsed = parse_url($origin);
            if (!empty($parsed['scheme']) && !empty($parsed['host'])) {
                $frontendUrl = $parsed['scheme'] . '://' . $parsed['host'] . (!empty($parsed['port']) ? ':' . $parsed['port'] : '');
            }
        }

        $magicLink = rtrim($frontendUrl, '/') . '/km/magic-login?token=' . $token;

        if (!empty($user->firebase_uid)) {
            try {
                UserNotification::create([
                    'firebase_uid' => $user->firebase_uid,
                    'title' => '🔑 តំណភ្ជាប់ចូលគណនីផ្ទាល់ (Magic Login Link)',
                    'message' => 'Admin បានបង្កើតតំណភ្ជាប់ចូលគណនី និងកំណត់ពាក្យសម្ងាត់ជូនលោកអ្នក។ មានសុពលភាព ២៤ ម៉ោង។',
                    'type' => 'system',
                    'read' => false,
                ]);
            } catch (\Throwable $e) {}
        }

        return response()->json([
            'success' => true,
            'message' => "បានបង្កើត Magic Login Link សម្រាប់ {$user->display_name} ជោគជ័យ!",
            'magic_link' => $magicLink,
            'token' => $token,
            'expires_at' => $user->magic_token_expires_at->toIso8601String(),
            'user' => [
                'id' => $user->id,
                'firebase_uid' => $user->firebase_uid,
                'display_name' => $user->display_name,
                'email' => $user->email,
                'phone' => $user->phone,
                'telegram' => $user->telegram,
            ],
        ]);
    }

    public function sendMagicLinkViaTelegram(Request $request, $id)
    {
        $user = UserProfile::findOrFail($id);

        if (!($user->is_active ?? true)) {
            return response()->json([
                'success' => false,
                'message' => "គណនីនេះត្រូវបានផ្អាកដំណើរការបណ្ដោះអាសន្ន។ សូមទាក់ទងមកកាន់ Admin ដើម្បីបើកដំណើរការឡើងវិញ។",
            ], 403);
        }

        if (empty($user->magic_login_token) || ($user->magic_token_expires_at && now()->greaterThan($user->magic_token_expires_at))) {
            if (empty($user->firebase_uid)) {
                $user->firebase_uid = 'stech_u_' . $user->id . '_' . Str::random(10);
            }
            $user->magic_login_token = Str::random(60);
            $user->magic_token_expires_at = now()->addHours(24);
            $user->last_password_reset_at = now();
            $user->save();
        }

        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
        $origin = $request->header('Origin') ?: $request->header('Referer');
        if ($origin) {
            $parsed = parse_url($origin);
            if (!empty($parsed['scheme']) && !empty($parsed['host'])) {
                $frontendUrl = $parsed['scheme'] . '://' . $parsed['host'] . (!empty($parsed['port']) ? ':' . $parsed['port'] : '');
            }
        }

        $magicLink = rtrim($frontendUrl, '/') . '/km/magic-login?token=' . $user->magic_login_token;
        $directChatId = $request->input('chat_id');

        $alertRes = \App\Services\TelegramService::sendCustomerMagicLinkAlert($user, $magicLink, $directChatId);

        return response()->json([
            'success' => ($alertRes['ok'] ?? false) === true,
            'channel' => $alertRes['channel'] ?? 'telegram_private',
            'message' => $alertRes['message'] ?? (($alertRes['ok'] ?? false) === true ? "បានផ្ញើ Magic Link ដោយជោគជ័យ!" : "មិនអាចផ្ញើបានទេ"),
            'magic_link' => $magicLink,
            'details' => $alertRes,
        ]);
    }

    public function magicLogin(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string',
        ]);

        $token = trim($validated['token']);
        $user = UserProfile::where('magic_login_token', $token)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'តំណភ្ជាប់ចូលគណនីមិនត្រឹមត្រូវ ឬត្រូវបានប្រើប្រាស់រួចហើយ (Invalid or already used token)។',
            ], 404);
        }

        if ($user->magic_token_expires_at && now()->greaterThan($user->magic_token_expires_at)) {
            return response()->json([
                'success' => false,
                'message' => 'តំណភ្ជាប់ចូលគណនីនេះបានផុតកំណត់សុពលភាពហើយ (Token Expired)។ សូមទាក់ទង Admin ដើម្បីបង្កើតតំណភ្ជាប់ថ្មី។',
            ], 410);
        }

        if (!($user->is_active ?? true)) {
            return response()->json([
                'success' => false,
                'message' => 'គណនីនេះត្រូវបានផ្អាកដំណើរការបណ្ដោះអាសន្ន។ សូមទាក់ទងមកកាន់ក្រុមការងារ Admin តាមរយៈ Telegram ឬទូរស័ព្ទដើម្បីបើកដំណើរការឡើងវិញ។',
            ], 403);
        }

        if (empty($user->firebase_uid)) {
            $user->firebase_uid = 'stech_u_' . $user->id . '_' . Str::random(10);
        }

        // Token consumed (one-time use security)
        $user->magic_login_token = null;
        $user->magic_token_expires_at = null;
        $user->last_password_reset_at = now();
        $user->save();

        try {
            UserNotification::create([
                'firebase_uid' => $user->firebase_uid,
                'title' => 'ចូលគណនីតាម Magic Link ជោគជ័យ 🔐',
                'message' => 'លោកអ្នកបានចូលប្រើប្រាស់គណនីដោយជោគជ័យតាមរយៈ Magic Login Link។',
                'type' => 'login',
                'read' => false,
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'message' => "ស្វាគមន៍ការចូលគណនី {$user->display_name}! (Magic Login Successful)",
            'user' => [
                'id' => $user->id,
                'firebase_uid' => $user->firebase_uid,
                'display_name' => $user->display_name ?: ('អតិថិជន #' . $user->id),
                'email' => $user->email,
                'phone' => $user->phone,
                'photo_url' => $user->photo_url ?: $user->avatar_url,
                'address' => $user->address,
                'city' => $user->city,
                'is_admin' => (bool)$user->is_admin,
                'points' => (int)($user->points ?? 0),
            ],
        ]);
    }

    public function updateAdminStatus(Request $request, $id)
    {
        $validated = $request->validate(['is_admin' => 'required|boolean']);
        $user = UserProfile::findOrFail($id);

        if (strtolower($user->email ?? '') === 'nobrothana180703@gmail.com') {
            return response()->json([
                'success' => false,
                'message' => 'មិនអាចផ្លាស់ប្តូរសិទ្ធិគណនីម្ចាស់ប្រព័ន្ធ (System Owner) បានដាច់ខាត!',
            ], 403);
        }

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

        if ($profile->wasRecentlyCreated) {
            try {
                \App\Services\TelegramService::sendNewUserRegistrationNotification([
                    'id' => $profile->id,
                    'name' => $profile->display_name ?: 'អតិថិជនថ្មី',
                    'email' => $profile->email ?: 'N/A',
                    'phone' => $profile->phone ?: 'N/A',
                    'role' => 'Customer',
                ]);
            } catch (\Throwable $t) {
                Log::warning("Telegram registration notification failed: " . $t->getMessage());
            }
        }

        // Auto-fetch genuine Telegram profile avatar if connected and missing photo
        $tgChatId = $profile->telegram_chat_id ?: (str_starts_with($uid, 'tg_') ? substr($uid, 3) : null);
        if (empty($profile->photo_url) && !empty($tgChatId)) {
            $realPhoto = \App\Services\TelegramService::getUserAvatarUrl((string)$tgChatId);
            if ($realPhoto) {
                $profile->photo_url = $realPhoto;
                $profile->avatar_url = $realPhoto;
                $profile->save();
            }
        }

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
                'wallet_balance' => (float)($profile->wallet_balance ?? 0.00),
                'unread_notifications' => $unreadNotifCount,
                'has_claimed_welcome_gift' => (bool)($profile->has_claimed_welcome_gift ?? false),
            ],
        ]);
    }

    /**
     * POST /api/user/claim-welcome-gift
     * Claim the $5 Welcome Gift Voucher after sharing.
     */
    public function claimWelcomeGift(Request $request)
    {
        $uid = $this->getUid($request);
        if (!$uid) {
            return response()->json([
                'success' => false,
                'message' => 'សូមចូលគណនីជាមុនសិន ដើម្បីទទួលកាដូស្វាគមន៍ $5',
            ], 401);
        }

        $user = UserProfile::where('firebase_uid', $uid)->first();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'រកមិនឃើញគណនីរបស់អ្នកទេ សូមព្យាយាមចូលគណនីម្ដងទៀត',
            ], 404);
        }

        if (!($user->is_active ?? true)) {
            return response()->json([
                'success' => false,
                'message' => 'គណនីនេះត្រូវបានផ្អាកដំណើរការបណ្ដោះអាសន្ន។ សូមទាក់ទងមកកាន់ Admin ដើម្បីដោះស្រាយ។',
            ], 403);
        }

        if ($user->has_claimed_welcome_gift) {
            return response()->json([
                'success' => true,
                'already_claimed' => true,
                'message' => 'លោកអ្នកបានទទួលកាដូស្វាគមន៍ $5.00 USD ចូលកាបូប S-Tech Wallet នេះរួចរាល់ហើយ!',
                'wallet_balance' => (float)($user->wallet_balance ?? 0.00),
                'voucher' => [
                    'code' => 'WELCOME5',
                    'value' => 5.00,
                    'type' => 'fixed',
                    'name' => 'កាដូស្វាគមន៍អតិថិជនថ្មី $5 OFF',
                ],
            ]);
        }

        // Ensure WELCOME5 promo code exists in database
        $promo = \App\Models\PromoCode::where('code', 'WELCOME5')->first();
        if (!$promo) {
            \App\Models\PromoCode::create([
                'name' => 'កាដូស្វាគមន៍អតិថិជនថ្មី $5 OFF',
                'code' => 'WELCOME5',
                'type' => 'fixed',
                'value' => 5.00,
                'status' => 'active',
                'description' => 'កាដូស្វាគមន៍អតិថិជនថ្មី បញ្ចុះ $5.00 ភ្លាមៗលើរាល់ការទិញទំនិញ',
                'usage_max' => 99999,
                'usage_count' => 0,
            ]);
        } else {
            if ($promo->status !== 'active') {
                $promo->status = 'active';
                $promo->save();
            }
        }

        // Credit $5.00 USD directly to user's S-Tech wallet balance (Spendable only in S Tech Store)
        $giftAmount = 5.00;
        $user->wallet_balance = ((float)($user->wallet_balance ?? 0.00)) + $giftAmount;
        $user->has_claimed_welcome_gift = true;
        $user->welcome_gift_claimed_at = now();
        $user->points = ($user->points ?? 0) + 50;
        $user->save();

        // Record official wallet ledger deposit transaction
        $giftTxId = 'GIFT_' . strtoupper(Str::random(8));
        try {
            WalletTransaction::create([
                'firebase_uid' => $user->firebase_uid,
                'type' => 'deposit',
                'amount' => $giftAmount,
                'coins' => 50,
                'description' => "កាដូស្វាគមន៍អតិថិជនថ្មី (+$5.00 USD ក្នុងកាបូប) • ចាយបានក្នុង S Tech Store",
                'payment_method' => 'welcome_gift',
                'reference_id' => $giftTxId,
                'status' => 'completed',
                'metadata' => [
                    'type' => 'welcome_gift',
                    'amount_usd' => $giftAmount,
                    'spendable_scope' => 's_tech_store_only',
                    'credited_at' => now()->toIso8601String(),
                ],
            ]);
        } catch (\Throwable $t) {
            Log::warning("Welcome gift wallet transaction record warning: " . $t->getMessage());
        }

        // Invalidate wallet cached statistics
        \Illuminate\Support\Facades\Cache::forget("wallet_stats_{$user->firebase_uid}");

        // In-app Notification
        try {
            UserNotification::create([
                'firebase_uid' => $user->firebase_uid,
                'title' => '🎉 ទទួលបានកាដូស្វាគមន៍ $5.00 USD ចូលកាបូបជោគជ័យ!',
                'message' => 'អបអរសាទរ! ទឹកប្រាក់កាដូ $5.00 USD ត្រូវបានបញ្ចូលទៅកាន់កាបូប S-Tech Wallet របស់អ្នករួចរាល់ហើយ។ លោកអ្នកអាចប្រើប្រាស់សមតុល្យនេះដើម្បីទិញទំនិញគ្រប់មុខក្នុង S Tech Store។',
                'type' => 'promo',
                'read' => false,
            ]);
        } catch (\Throwable $t) {}

        // Telegram Finance / Bonus Alert
        try {
            \App\Services\TelegramService::sendFinanceAlert([
                'type' => 'Welcome Gift ($5.00 Credited to Wallet)',
                'amount' => $giftAmount,
                'method' => 'WELCOME_GIFT_BONUS',
                'order_id' => $giftTxId,
                'customer' => $user->display_name ?: 'S-Tech Customer',
            ]);
        } catch (\Throwable $t) {}

        return response()->json([
            'success' => true,
            'message' => 'អបអរសាទរ! លោកអ្នកទទួលបានកាដូ $5.00 USD ចូលទៅក្នុងកាបូប S-Tech Wallet ដោយជោគជ័យ 🎉 (អាចចាយបានក្នុង S Tech Store)',
            'amount_credited' => $giftAmount,
            'new_wallet_balance' => (float)$user->wallet_balance,
            'points_bonus' => 50,
            'voucher' => [
                'code' => 'WELCOME5',
                'value' => 5.00,
                'type' => 'fixed',
                'name' => 'កាដូស្វាគមន៍អតិថិជនថ្មី $5 OFF',
            ],
        ]);
    }

    /**
     * POST /api/user/send-welcome-email
     * Sends the warm Khmer Welcome Email with $5 WELCOME5 voucher and exploration links.
     */
    public function sendWelcomeEmail(Request $request)
    {
        $email = $request->input('email');
        $username = $request->input('username');

        if (empty($email)) {
            $uid = $this->getUid($request);
            if ($uid) {
                $user = UserProfile::where('firebase_uid', $uid)->first();
                if ($user && !empty($user->email)) {
                    $email = $user->email;
                    if (empty($username)) {
                        $username = $user->username ?: $user->display_name;
                    }
                }
            }
        }

        if (empty($email)) {
            return response()->json([
                'success' => false,
                'message' => 'សូមបញ្ជាក់អ៊ីមែលសម្រាប់ផ្ញើលិខិតស្វាគមន៍',
            ], 422);
        }

        $res = \App\Services\EmailService::sendWelcomeEmail($email, $username);

        return response()->json([
            'success' => true,
            'message' => "បានផ្ញើអ៊ីមែលស្វាគមន៍ដោយជោគជ័យទៅកាន់ {$email}!",
            'data' => $res,
        ]);
    }

    /**
     * POST /api/user/send-reset-email
    /**
     * POST /api/user/send-reset-email
     * Intelligent Password Reset & Magic Login dispatcher:
     * 1. Telegram user -> Sends magic reset link directly to customer Telegram private chat (@S_TECH_ASSISTANTBOT)
     * 2. Google / Real Email user -> Sends official password reset email to real Gmail
     * 3. Hybrid user (Email + Telegram) -> Honors selected 'channel' parameter ('telegram' | 'email')
     */
    public function sendResetEmail(Request $request)
    {
        $requestedChannel = strtolower(trim((string)$request->input('channel', 'auto')));
        $email = $request->input('email');
        $username = $request->input('username');
        $telegramChatId = $request->input('telegram_chat_id');
        $firebaseUid = $request->input('firebase_uid') ?: $this->getUid($request);

        $user = null;
        if ($firebaseUid) {
            $user = UserProfile::where('firebase_uid', $firebaseUid)->first();
        }
        if (!$user && !empty($telegramChatId)) {
            $user = UserProfile::where('telegram_chat_id', (string)$telegramChatId)->first();
        }
        if (!$user && !empty($email)) {
            $user = UserProfile::where('email', $email)->first();
        }

        if ($user) {
            if (empty($email)) $email = $user->email;
            if (empty($username)) $username = $user->display_name ?: $user->username;
            if (empty($telegramChatId)) $telegramChatId = $user->telegram_chat_id;
            if (empty($telegramChatId) && !empty($user->firebase_uid) && str_starts_with($user->firebase_uid, 'tg_')) {
                $telegramChatId = preg_replace('/\D/', '', substr($user->firebase_uid, 3));
            }
        }

        $cleanEmail = strtolower(trim((string)$email));
        $isSyntheticEmail = str_ends_with($cleanEmail, '@telegram.s-tech-store.tech') || 
                            str_ends_with($cleanEmail, '@tiktok.s-tech-store.tech');
        $hasRealEmail = !empty($cleanEmail) && filter_var($cleanEmail, FILTER_VALIDATE_EMAIL) && !$isSyntheticEmail;
        $hasTelegram = !empty($telegramChatId) || ($user && (!empty($user->telegram_chat_id) || !empty($user->telegram)));

        // Resolve destination channel
        $finalChannel = 'email';
        if ($requestedChannel === 'telegram') {
            $finalChannel = 'telegram';
        } elseif ($requestedChannel === 'email') {
            $finalChannel = 'email';
        } else {
            // Auto detection:
            if ($hasTelegram && !$hasRealEmail) {
                $finalChannel = 'telegram';
            } elseif ($hasRealEmail && !$hasTelegram) {
                $finalChannel = 'email';
            } elseif ($hasTelegram && $hasRealEmail) {
                $isTgAuth = ($user && $user->provider === 'telegram') || str_starts_with($firebaseUid ?? '', 'tg_');
                $finalChannel = $isTgAuth ? 'telegram' : 'email';
            } else {
                $finalChannel = $hasTelegram ? 'telegram' : 'email';
            }
        }

        // If email was chosen or defaulted, but the only email on file is synthetic @telegram... -> re-route to Telegram!
        if ($finalChannel === 'email' && $isSyntheticEmail && $hasTelegram) {
            $finalChannel = 'telegram';
        }

        $frontendUrl = env('FRONTEND_URL', 'https://www.s-tech-store.tech');

        // ── Telegram Channel ──────────────────────────────────────────────────
        if ($finalChannel === 'telegram') {
            if (!$user && $firebaseUid) {
                $user = UserProfile::firstOrCreate(
                    ['firebase_uid' => $firebaseUid],
                    [
                        'display_name' => $username ?: 'អតិថិជន VIP',
                        'telegram_chat_id' => $telegramChatId,
                        'provider' => 'telegram'
                    ]
                );
            }

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'មិនអាចស្វែងរកគណនី Telegram របស់អ្នកបានឡើយ។ សូមប្រាកដថាអ្នកបានភ្ជាប់គណនីរួចរាល់។',
                ], 422);
            }

            $user->magic_login_token = \Illuminate\Support\Str::random(60);
            $user->magic_token_expires_at = now()->addHours(24);
            $user->last_password_reset_at = now();
            if ($telegramChatId && empty($user->telegram_chat_id)) {
                $user->telegram_chat_id = (string)$telegramChatId;
            }
            $user->save();

            $magicLink = rtrim($frontendUrl, '/') . '/km/magic-login?token=' . $user->magic_login_token;
            $alertRes = \App\Services\TelegramService::sendCustomerMagicLinkAlert($user, $magicLink, $telegramChatId);
            $tgSuccess = ($alertRes['ok'] ?? false) === true;

            return response()->json([
                'success' => $tgSuccess,
                'channel' => 'telegram',
                'telegram_chat_id' => $telegramChatId ?: $user->telegram_chat_id,
                'telegram_username' => $user->telegram,
                'magic_link' => $magicLink,
                'message' => $tgSuccess
                    ? "បានផ្ញើតំណភ្ជាប់ Reset Password / Magic Login ទៅកាន់ Telegram Bot (@S_TECH_ASSISTANTBOT) រួចរាល់ហើយ! 🔑📱"
                    : ($alertRes['message'] ?? "មិនអាចផ្ញើសារទៅកាន់ Telegram Bot បានទេ សូមចុច START Bot ជាមុនសិន!"),
            ]);
        }

        // ── Real Email Channel ─────────────────────────────────────────────────
        if (!$hasRealEmail) {
            return response()->json([
                'success' => false,
                'message' => 'សូមបញ្ចូលអាសយដ្ឋាន Gmail/Email ពិតប្រាកដរបស់អ្នក ដើម្បីទទួលតំណភ្ជាប់ផ្លាស់ប្តូរពាក្យសម្ងាត់',
            ], 422);
        }

        if ($user) {
            $user->magic_login_token = \Illuminate\Support\Str::random(60);
            $user->magic_token_expires_at = now()->addHours(24);
            $user->last_password_reset_at = now();
            $user->save();
        }

        $magicLink = ($user && $user->magic_login_token)
            ? rtrim($frontendUrl, '/') . '/km/magic-login?token=' . $user->magic_login_token
            : null;

        $res = \App\Services\EmailService::sendPasswordResetEmail($cleanEmail, $username);

        return response()->json([
            'success' => true,
            'channel' => 'email',
            'email' => $cleanEmail,
            'magic_link' => $magicLink,
            'message' => "បានផ្ញើតំណភ្ជាប់ផ្លាស់ប្តូរពាក្យសម្ងាត់ទៅកាន់ {$cleanEmail} រួចរាល់ហើយ! 🔑",
            'data' => $res,
        ]);
    }

    /**
     * POST /api/user/send-confirm-email
     * Send email confirmation OTP & link to real Gmail
     */
    public function sendConfirmEmail(Request $request)
    {
        $email = $request->input('email');
        $username = $request->input('username');

        if (empty($email)) {
            $uid = $this->getUid($request);
            if ($uid) {
                $user = UserProfile::where('firebase_uid', $uid)->first();
                if ($user && !empty($user->email)) {
                    $email = $user->email;
                    if (empty($username)) {
                        $username = $user->username ?: $user->display_name;
                    }
                }
            }
        }

        $cleanEmail = strtolower(trim((string)$email));
        if (empty($cleanEmail) || !filter_var($cleanEmail, FILTER_VALIDATE_EMAIL)) {
            return response()->json([
                'success' => false,
                'message' => 'សូមបញ្ជាក់អាសយដ្ឋាន Gmail/Email ត្រឹមត្រូវ',
            ], 422);
        }

        $res = \App\Services\EmailService::sendEmailConfirmation($cleanEmail, $username);

        return response()->json([
            'success' => true,
            'message' => "បានផ្ញើលេខកូដបញ្ជាក់ទៅកាន់ {$cleanEmail} រួចរាល់ហើយ! 📩",
            'data' => $res,
        ]);
    }

    /**
     * POST /api/user/verify-confirm-email
     * Verify email confirmation OTP or Token
     */
    public function verifyConfirmEmail(Request $request)
    {
        $email = strtolower(trim((string)$request->input('email')));
        $otp = trim((string)$request->input('otp'));
        $token = trim((string)$request->input('token'));

        $matched = false;

        if (!empty($otp) && !empty($email)) {
            $cachedOtp = \Illuminate\Support\Facades\Cache::get("email_verify_otp_{$email}");
            if ($cachedOtp && (string)$cachedOtp === (string)$otp) {
                $matched = true;
                \Illuminate\Support\Facades\Cache::forget("email_verify_otp_{$email}");
            }
        }

        if (!$matched && !empty($token)) {
            $tokenData = \Illuminate\Support\Facades\Cache::get("email_verify_token_{$token}");
            if ($tokenData && (!empty($tokenData['email']))) {
                if (empty($email) || $email === strtolower($tokenData['email'])) {
                    $email = strtolower($tokenData['email']);
                    $matched = true;
                    \Illuminate\Support\Facades\Cache::forget("email_verify_token_{$token}");
                }
            }
        }

        if (!$matched) {
            return response()->json([
                'success' => false,
                'message' => 'លេខកូដ OTP ឬ Token មិនត្រឹមត្រូវ ឬបានផុតកំណត់សុពលភាព!',
            ], 422);
        }

        // Mark user profile as active/verified
        $user = UserProfile::where('email', $email)->first();
        if ($user) {
            $user->status = 'active';
            $user->save();
        }

        \Illuminate\Support\Facades\Cache::put("email_verified_{$email}", true, 86400 * 365);

        return response()->json([
            'success' => true,
            'message' => "អាសយដ្ឋាន Gmail ({$email}) ត្រូវបានផ្ទៀងផ្ទាត់ជោគជ័យ ១០០%! 🎉",
            'email' => $email,
            'verified' => true,
        ]);
    }

    /**
     * POST /api/user/request-2fa-otp
     * Sends a 6-digit OTP code to the user's Telegram or real Gmail/email.
     * Supports intelligent channel selection:
     * 1. Telegram user -> sends OTP directly to Telegram private chat via Customer Bot (@S_TECH_ASSISTANTBOT)
     * 2. Email/Gmail user -> sends OTP directly to real Gmail/email address
     * 3. Both Email & Telegram -> lets user choose or respects 'channel' parameter ('telegram' | 'email')
     */
    public function requestTwoFactorOtp(Request $request)
    {
        $requestedChannel = strtolower(trim((string)$request->input('channel', 'auto')));
        $email = $request->input('email');
        $username = $request->input('username');
        $telegramChatId = $request->input('telegram_chat_id');

        $user = null;
        $uid = $this->getUid($request) ?: $request->input('firebase_uid');
        if ($uid) {
            $user = UserProfile::where('firebase_uid', $uid)->first();
        }
        if (!$user && !empty($email)) {
            $user = UserProfile::where('email', $email)->first();
        }
        if (!$user && !empty($telegramChatId)) {
            $user = UserProfile::where('telegram_chat_id', (string)$telegramChatId)->first();
        }

        // Resolve customer data from user record if found
        if ($user) {
            if (empty($email)) $email = $user->email;
            if (empty($username)) $username = $user->display_name ?: $user->username;
            if (empty($telegramChatId)) {
                $telegramChatId = $user->telegram_chat_id;
                if (empty($telegramChatId) && !empty($user->firebase_uid) && str_starts_with($user->firebase_uid, 'tg_')) {
                    $telegramChatId = substr($user->firebase_uid, 3);
                } elseif (empty($telegramChatId) && !empty($user->telegram) && is_numeric($user->telegram)) {
                    $telegramChatId = (string)$user->telegram;
                }
                if (empty($telegramChatId)) {
                    $telegramChatId = \App\Services\TelegramService::resolveCustomerChatId($user);
                }
            }
        }

        if (empty($telegramChatId) && !empty($email)) {
            $telegramChatId = \App\Services\TelegramService::resolveCustomerChatId($email);
        }

        // Determine real email vs Telegram placeholder
        $isRealEmail = !empty($email) 
            && !str_ends_with(strtolower($email), '@telegram.s-tech-store.tech') 
            && !str_ends_with(strtolower($email), '@tiktok.s-tech-store.tech');
        
        $hasTelegram = !empty($telegramChatId);

        if (!$hasTelegram && !$isRealEmail) {
            return response()->json([
                'success' => false,
                'message' => 'មិនមានព័ត៌មាន Telegram ឬ Gmail សម្រាប់ផ្ញើលេខកូដ 2FA ឡើយ! សូមភ្ជាប់ Telegram ឬបញ្ចូល Gmail ក្នុងគណនីរបស់អ្នក។',
            ], 422);
        }

        // Determine destination channel
        $targetChannel = $requestedChannel;
        if ($targetChannel === 'auto' || empty($targetChannel)) {
            if ($hasTelegram && !$isRealEmail) {
                $targetChannel = 'telegram';
            } elseif ($isRealEmail && !$hasTelegram) {
                $targetChannel = 'email';
            } else {
                // If user has both, default based on login provider
                $targetChannel = ($user && (str_starts_with($user->firebase_uid ?? '', 'tg_') || ($user->provider ?? '') === 'telegram')) 
                    ? 'telegram' 
                    : 'email';
            }
        }

        // Safety check requested channel availability
        if ($targetChannel === 'telegram' && !$hasTelegram) {
            return response()->json([
                'success' => false,
                'message' => 'គណនីរបស់អ្នកមិនទាន់បានភ្ជាប់ Telegram Bot នៅឡើយទេ។ សូមជ្រើសរើសផ្ញើតាម Gmail ឬភ្ជាប់ Telegram ជាមុនសិន!',
            ], 422);
        }

        if ($targetChannel === 'email' && !$isRealEmail) {
            return response()->json([
                'success' => false,
                'message' => 'គណនីរបស់អ្នកបានចុះឈ្មោះតាម Telegram មិនទាន់មានអាសយដ្ឋាន Gmail ពិតប្រាកដឡើយ។ សូមជ្រើសរើសផ្ញើតាម Telegram!',
            ], 422);
        }

        // Generate 6-digit OTP code
        $otp = sprintf('%06d', mt_rand(100000, 999999));
        $ttl = 10 * 60; // 10 minutes

        // Cache OTP under all possible keys so verifyTwoFactorOtp ALWAYS finds it
        if ($user) {
            \Illuminate\Support\Facades\Cache::put("2fa_otp_uid_{$user->firebase_uid}", $otp, $ttl);
            \Illuminate\Support\Facades\Cache::put("2fa_otp_id_{$user->id}", $otp, $ttl);
        }
        if (!empty($email)) {
            \Illuminate\Support\Facades\Cache::put("2fa_otp_{$email}", $otp, $ttl);
            \Illuminate\Support\Facades\Cache::put("2fa_otp_email_{$email}", $otp, $ttl);
        }
        if (!empty($telegramChatId)) {
            \Illuminate\Support\Facades\Cache::put("2fa_otp_{$telegramChatId}", $otp, $ttl);
            \Illuminate\Support\Facades\Cache::put("2fa_otp_tg_{$telegramChatId}", $otp, $ttl);
        }

        $customerName = $username ?: ($user->display_name ?? 'អតិថិជន S Tech Store');

        if ($targetChannel === 'telegram') {
            $tgRes = \App\Services\TelegramService::sendCustomerTwoFactorOtp($telegramChatId, $otp, $customerName);
            if (!($tgRes['ok'] ?? false)) {
                $desc = $tgRes['description'] ?? '';
                \Illuminate\Support\Facades\Log::warning("Telegram 2FA OTP error for {$telegramChatId}: " . json_encode($tgRes));
                if (str_contains(strtolower($desc), 'blocked') || str_contains(strtolower($desc), 'chat not found') || str_contains(strtolower($desc), 'can\'t initiate')) {
                    $botName = \App\Services\TelegramService::getCustomerBotUsername();
                    return response()->json([
                        'success' => false,
                        'error_type' => 'bot_not_started',
                        'bot_username' => $botName,
                        'message' => "មិនអាចផ្ញើសារចូល Telegram បានទេ! សូមចុច /start ក្នុង Bot @{$botName} រួចចុចផ្ញើម្ដងទៀត។",
                    ], 400);
                }
            }

            return response()->json([
                'success' => true,
                'channel' => 'telegram',
                'has_telegram' => $hasTelegram,
                'has_email' => $isRealEmail,
                'telegram_chat_id' => $telegramChatId,
                'telegram_handle' => $user ? ($user->telegram ?? null) : null,
                'email' => $isRealEmail ? $email : null,
                'message' => "លេខកូដសុវត្ថិភាព 2FA ត្រូវបានផ្ញើទៅកាន់ Telegram របស់អ្នក (@" . ltrim(($user && !empty($user->telegram)) ? $user->telegram : 'Bot', '@') . ") រួចរាល់ហើយ! (សុពលភាព ១០ នាទី)",
            ]);
        }

        // Otherwise target channel is 'email'
        try {
            \App\Services\EmailService::sendTwoFactorOtpEmail($email, $customerName, 'verify', $otp);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Email 2FA dispatch warning: " . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'channel' => 'email',
            'has_telegram' => $hasTelegram,
            'has_email' => $isRealEmail,
            'email' => $email,
            'message' => "លេខកូដសុវត្ថិភាព 2FA ត្រូវបានផ្ញើទៅកាន់អ៊ីមែល {$email} រួចរាល់ហើយ! (សុពលភាព ១០ នាទី)",
        ]);
    }

    /**
     * POST /api/user/verify-2fa-otp
     * Validates the 6-digit OTP code and updates 2FA status in UserProfile.
     */
    public function verifyTwoFactorOtp(Request $request)
    {
        $validated = $request->validate([
            'otp' => 'required|string',
            'enable' => 'nullable|boolean',
            'email' => 'nullable|string',
            'telegram_chat_id' => 'nullable|string',
        ]);

        $otp = trim($validated['otp']);
        $uid = $this->getUid($request) ?: $request->input('firebase_uid');
        $user = null;

        if ($uid) {
            $user = UserProfile::where('firebase_uid', $uid)->first();
        }
        if (!$user && !empty($validated['email'])) {
            $user = UserProfile::where('email', $validated['email'])->first();
        }
        if (!$user && !empty($validated['telegram_chat_id'])) {
            $user = UserProfile::where('telegram_chat_id', (string)$validated['telegram_chat_id'])->first();
        }

        $email = $user ? $user->email : ($validated['email'] ?? null);
        $tgChatId = $user ? ($user->telegram_chat_id ?? (str_starts_with($user->firebase_uid ?? '', 'tg_') ? substr($user->firebase_uid, 3) : null)) : ($validated['telegram_chat_id'] ?? null);

        // Check cached OTP against all possible keys
        $cachedOtp = null;
        $keysToCheck = [];
        if ($user) {
            $keysToCheck[] = "2fa_otp_uid_{$user->firebase_uid}";
            $keysToCheck[] = "2fa_otp_id_{$user->id}";
        }
        if (!empty($email)) {
            $keysToCheck[] = "2fa_otp_{$email}";
            $keysToCheck[] = "2fa_otp_email_{$email}";
        }
        if (!empty($tgChatId)) {
            $keysToCheck[] = "2fa_otp_{$tgChatId}";
            $keysToCheck[] = "2fa_otp_tg_{$tgChatId}";
        }

        foreach ($keysToCheck as $k) {
            $val = \Illuminate\Support\Facades\Cache::get($k);
            if (!empty($val)) {
                $cachedOtp = $val;
                break;
            }
        }

        if (!$cachedOtp || trim((string)$cachedOtp) !== $otp) {
            return response()->json([
                'success' => false,
                'message' => 'លេខកូដ OTP មិនត្រឹមត្រូវ ឬផុតកំណត់សុពលភាពហើយ សូមស្នើសុំលេខកូដថ្មី!',
            ], 400);
        }

        // OTP verified - clear all cached keys
        foreach ($keysToCheck as $k) {
            \Illuminate\Support\Facades\Cache::forget($k);
        }

        $enable = $request->boolean('enable', true);

        if ($user) {
            $user->two_fa_enabled = $enable;
            $user->save();

            try {
                UserNotification::create([
                    'user_id' => $user->firebase_uid ?? (string)$user->id,
                    'title' => $enable ? '🛡️ បានបើកប្រព័ន្ធ 2FA ជោគជ័យ' : '🔓 បានបិទប្រព័ន្ធ 2FA',
                    'message' => $enable ? 'គណនីរបស់អ្នកឥឡូវនេះត្រូវបានការពារដោយប្រព័ន្ធ Two-Factor Authentication។' : 'ប្រព័ន្ធ Two-Factor Authentication ត្រូវបានបិទលើគណនីរបស់អ្នក។',
                    'type' => 'security',
                    'is_read' => false,
                ]);
            } catch (\Exception $e) {}
        }

        return response()->json([
            'success' => true,
            'two_fa_enabled' => $enable,
            'message' => $enable ? 'អបអរសាទរ! បានផ្ទៀងផ្ទាត់ និងបើកប្រព័ន្ធ Two-Factor Authentication ដោយជោគជ័យ 🛡️' : 'បានបិទប្រព័ន្ធ Two-Factor Authentication រួចរាល់!',
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
            'username' => 'nullable|string|max:100',
            'email' => 'nullable|string|max:255',
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
            'notif_telegram' => 'nullable|boolean',
            'telegram_chat_id' => 'nullable|string|max:100',
        ]);

        if (empty($validated['display_name']) && !empty($validated['username'])) {
            $validated['display_name'] = $validated['username'];
        }

        // 1-to-1 Telegram uniqueness guard & seamless orphan auto-merge
        if (!empty($validated['telegram_chat_id'])) {
            $conflict = UserProfile::where(function($q) use ($validated) {
                    $q->where('telegram_chat_id', (string)$validated['telegram_chat_id'])
                      ->orWhere('firebase_uid', 'tg_' . $validated['telegram_chat_id']);
                })
                ->where('firebase_uid', '!=', $uid)
                ->first();
            if ($conflict) {
                if (str_starts_with($conflict->firebase_uid, 'tg_') || empty($conflict->email) || (isset($validated['email']) && $conflict->email === $validated['email'])) {
                    // Safe auto-merge: clear orphan's telegram_chat_id and migrate orders
                    $conflict->update(['telegram_chat_id' => null, 'telegram' => null, 'notif_telegram' => false, 'is_active' => false]);
                    try {
                        \App\Models\Order::where('user_id', (string)$conflict->id)
                            ->orWhere('user_id', $conflict->firebase_uid)
                            ->update(['user_id' => $uid]);
                    } catch (\Throwable $t) {}
                } else {
                    unset($validated['telegram_chat_id']);
                    unset($validated['telegram']);
                }
            }
        }
        if (!empty($validated['email'])) {
            $newEmail = strtolower(trim($validated['email']));
            if (filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
                $validated['email'] = $newEmail;
            } else {
                unset($validated['email']);
            }
        }

        $profile = UserProfile::firstOrCreate(['firebase_uid' => $uid]);
        $profile->update($validated);

        if (!empty($validated['email'])) {
            try {
                \App\Models\Order::where(function($q) use ($uid, $profile) {
                    $q->where('user_id', $uid);
                    if (!empty($profile->phone)) {
                        $q->orWhere('customer_phone', $profile->phone);
                    }
                })->where(function($q) {
                    $q->whereNull('customer_email')
                      ->orWhere('customer_email', 'like', '%@s-tech-store.tech')
                      ->orWhere('customer_email', 'like', '%@telegram.s-tech-store.tech');
                })->update(['customer_email' => $validated['email']]);
            } catch (\Throwable $t) {}
        }

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

        // Strict File Validation: only allow verified raster image MIME types, max 5MB
        $request->validate([
            'avatar' => 'nullable|file|image|mimes:jpeg,png,jpg,webp,gif|max:5120',
            'photo' => 'nullable|file|image|mimes:jpeg,png,jpg,webp,gif|max:5120',
            'image' => 'nullable|file|image|mimes:jpeg,png,jpg,webp,gif|max:5120',
        ]);

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
            'link' => 'nullable|string|max:500',
            'image' => 'nullable|string|max:1000',
        ]);

        $notification = UserNotification::create([
            'firebase_uid' => $uid,
            'title' => $validated['title'],
            'message' => $validated['message'],
            'type' => $validated['type'] ?? 'system',
            'link' => $validated['link'] ?? null,
            'image' => $validated['image'] ?? null,
        ]);

        return response()->json($notification, 201);
    }

    /**
     * GET /api/user/public/{identifier}
     * Retrieve public profile of a user (by firebase_uid or id)
     * All profiles are public on S Tech Store
     */
    public function getPublicProfile($identifier)
    {
        $profile = UserProfile::where('firebase_uid', $identifier)
            ->orWhere('id', is_numeric($identifier) ? (int)$identifier : 0)
            ->first();

        if (!$profile) {
            return response()->json([
                'success' => true,
                'is_fallback' => true,
                'display_name' => 'S Tech Customer',
                'photo_url' => null,
                'profession' => 'Tech Enthusiast',
                'city' => 'Phnom Penh, Cambodia',
                'member_since' => '2026',
                'verified_buyer' => true,
                'total_reviews' => 0,
                'reviews' => [],
            ]);
        }

        $reviews = \App\Models\ProductReview::where('firebase_uid', $profile->firebase_uid)
            ->with(['product:id,name,slug,price,sale_price,image_url,images'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($rev) {
                return [
                    'id' => $rev->id,
                    'rating' => (int)$rev->rating,
                    'comment' => $rev->comment,
                    'created_at' => $rev->created_at ? $rev->created_at->toIso8601String() : null,
                    'product' => $rev->product ? [
                        'id' => $rev->product->id,
                        'name' => $rev->product->name,
                        'slug' => $rev->product->slug,
                        'price' => $rev->product->price,
                        'sale_price' => $rev->product->sale_price,
                        'image' => $rev->product->image_url ?? (!empty($rev->product->images) ? $rev->product->images[0] : null),
                    ] : null,
                ];
            });

        $orderCount = Order::where('user_id', $profile->firebase_uid)->count();

        return response()->json([
            'success' => true,
            'id' => $profile->id,
            'firebase_uid' => $profile->firebase_uid,
            'display_name' => $profile->display_name ?: ('Customer #' . $profile->id),
            'photo_url' => $profile->photo_url ?: $profile->avatar_url,
            'profession' => $profile->profession ?: 'Tech Customer',
            'city' => $profile->city ?: 'Phnom Penh, Cambodia',
            'member_since' => $profile->created_at ? $profile->created_at->format('M Y') : '2026',
            'verified_buyer' => true,
            'points' => (int)($profile->points ?? 0),
            'total_reviews' => $reviews->count(),
            'reviews' => $reviews,
        ]);
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
            ->where(function ($q) use ($productId) {
                $q->where('product_id', $productId)
                  ->orWhere('id', $productId);
            })
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

        UserCartItem::where('firebase_uid', $uid)
            ->where(function ($q) use ($productId) {
                $q->where('product_id', $productId)
                  ->orWhere('id', $productId);
            })
            ->delete();

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
        $rawChatId = $request->header('X-Telegram-Chat-ID') ?: $request->query('chat_id');
        $chatId = $rawChatId ? preg_replace('/\D/', '', $rawChatId) : null;

        $token = $request->header('X-Customer-Token')
            ?: $request->query('tg_token')
            ?: $request->query('token');

        $user = null;
        if (!empty($token)) {
            $sessUserId = \Illuminate\Support\Facades\Cache::get("customer_sess_{$token}");
            if ($sessUserId) {
                $user = UserProfile::find($sessUserId);
            }
            if (!$user) {
                $user = UserProfile::where('magic_login_token', $token)->first();
            }
        }

        if (!$user && !empty($chatId)) {
            $user = \App\Services\TelegramService::resolveActiveUser((string)$chatId);
        }

        $uid = null;
        if (!$user) {
            $uid = $this->getUid($request);
            if ($uid) {
                $user = UserProfile::where('firebase_uid', $uid)
                    ->orWhere('id', is_numeric($uid) ? (int)$uid : 0)
                    ->first();
            }
        }

        // Support direct lookup of an order by order_id or id if supplied (e.g. from Telegram alert direct link)
        $targetOrderId = $request->query('order_id') ?: $request->query('id') ?: $request->header('X-Order-ID');
        if ($targetOrderId && !$user) {
            $cleanTarget = ltrim($targetOrderId, '#');
            $targetOrder = Order::where('order_id', $cleanTarget)
                ->orWhere('order_id', '#' . $cleanTarget)
                ->orWhere('id', is_numeric($cleanTarget) ? (int)$cleanTarget : 0)
                ->first();
            if ($targetOrder) {
                if (!empty($targetOrder->user_id)) {
                    $user = UserProfile::where('firebase_uid', $targetOrder->user_id)->first();
                }
                if (!$user && !empty($targetOrder->customer_phone)) {
                    $user = UserProfile::where('phone', $targetOrder->customer_phone)->first();
                }
                if (!$user && !empty($targetOrder->customer_email)) {
                    $user = UserProfile::where('email', $targetOrder->customer_email)->first();
                }
            }
        }

        if ($user && !empty($user->telegram_chat_id) && !$chatId) {
            $chatId = preg_replace('/\D/', '', (string)$user->telegram_chat_id);
        }

        if (!$uid && !$user && !$chatId && !$targetOrderId) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Delegate to unified TelegramService::getCustomerOrdersBuilder for 100% parity with Telegram Bot & Web
        $effectiveChatId = (string)($chatId ?: ($user->telegram_chat_id ?? $uid ?? ''));
        $ordersBuilder = \App\Services\TelegramService::getCustomerOrdersBuilder($effectiveChatId, $user);

        // If specific order_id was requested, also ensure it is included
        if ($targetOrderId) {
            $cleanTargetId = ltrim($targetOrderId, '#');
            $ordersBuilder = $ordersBuilder->orWhere(function ($q) use ($cleanTargetId) {
                $q->where('order_id', $cleanTargetId)
                  ->orWhere('order_id', '#' . $cleanTargetId)
                  ->orWhere('id', is_numeric($cleanTargetId) ? (int)$cleanTargetId : 0);
            });
        }

        $orders = $ordersBuilder
            ->with(['items' => function ($q) {
                $q->with(['product:id,name,image_url,images']);
            }])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($orders);
    }

    /**
     * POST /api/admin/users/{id}/adjust-points
     * Allows Admin/Staff to adjust customer loyalty coins/points with reason.
     */
    public function adjustPoints(Request $request, $id)
    {
        $validated = $request->validate([
            'points' => 'required|integer',
            'reason' => 'nullable|string|max:255',
        ]);

        $user = UserProfile::findOrFail($id);
        $user->points = max(0, ((int)($user->points ?? 0)) + $validated['points']);
        $user->save();

        try {
            UserNotification::create([
                'user_id' => $user->firebase_uid ?? (string)$user->id,
                'title' => 'កាក់ភក្តីភាព / Loyalty Points Updated',
                'message' => ($validated['points'] >= 0 ? '+' : '') . $validated['points'] . ' points. ' . ($validated['reason'] ?? 'Point adjustment by store admin.'),
                'type' => 'points',
                'is_read' => false,
            ]);
        } catch (\Exception $e) {
            Log::warning("Could not create UserNotification for points adjustment: " . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'បានកែសម្រួលពិន្ទុអតិថិជនដោយជោគជ័យ',
            'points' => $user->points,
            'user' => $user,
        ]);
    }

    /**
     * GET /api/admin/users/{id}/orders
     * Fetch all order history for a specific customer.
     */
    public function getUserOrdersForAdmin($id)
    {
        $user = UserProfile::findOrFail($id);
        $orders = Order::where(function ($q) use ($user) {
            if (!empty($user->firebase_uid)) {
                $q->where('user_id', $user->firebase_uid);
            }
            if (!empty($user->phone)) {
                $q->orWhere('customer_phone', $user->phone);
            }
        })
        ->with('items')
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'orders' => $orders,
        ]);
    }
}
