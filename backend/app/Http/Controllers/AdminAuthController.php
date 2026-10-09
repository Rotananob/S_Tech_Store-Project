<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Branch;
use App\Models\Shift;

class AdminAuthController extends Controller
{
    /**
     * Admin/Staff Login
     * High security: bcrypt password checking + rate limiting (5 attempts/min)
     */
    public function login(Request $request)
    {
        $throttleKey = 'admin-login:' . $request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many login attempts. Please try again in {$seconds} seconds.",
            ], 429);
        }

        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        $user = User::where('email', strtolower(trim($validated['email'])))->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            RateLimiter::hit($throttleKey, 60);
            return response()->json([
                'message' => 'Invalid email or password. Access denied.',
            ], 401);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'This account has been deactivated. Please contact the administrator.',
            ], 403);
        }

        RateLimiter::clear($throttleKey);

        // Generate high-entropy 64-char API token
        $token = bin2hex(random_bytes(32));
        $user->api_token = $token;
        $user->last_login_at = now();
        $user->save();

        // Also ensure user is in UserProfile with is_admin = true
        UserProfile::updateOrCreate(
            ['email' => $user->email],
            [
                'firebase_uid' => 'ADMIN_SYS_' . md5($user->email),
                'display_name' => $user->name,
                'is_admin' => true,
                'phone' => $user->phone,
            ]
        );

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role, // 'admin' or 'staff'
                'branch' => $user->branch,
                'shift' => $user->shift,
                'phone' => $user->phone,
                'status' => $user->status,
                'permissions' => $user->permissions ?? ($user->role === 'admin' ? ['*'] : ['manage_products', 'manage_orders', 'view_inventory']),
            ],
        ]);
    }

    /**
     * Get current authenticated admin/staff profile
     */
    public function me(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'branch' => $user->branch,
                'shift' => $user->shift,
                'phone' => $user->phone,
                'status' => $user->status,
                'permissions' => $user->permissions,
            ],
        ]);
    }

    /**
     * Logout
     */
    public function logout(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        if ($user) {
            $user->api_token = null;
            $user->save();
        }

        return response()->json(['message' => 'Logged out successfully']);
    }

    /**
     * List all staff accounts (Admin Only)
     */
    public function staffList(Request $request)
    {
        $currentUser = $request->attributes->get('auth_user');
        if ($currentUser && $currentUser->role !== 'admin') {
            return response()->json(['message' => 'Forbidden: Only administrators can view staff accounts.'], 403);
        }

        $staff = User::select('id', 'name', 'email', 'role', 'branch', 'shift', 'phone', 'status', 'created_at', 'last_login_at')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json($staff);
    }

    /**
     * Create a new Staff or Admin account (Admin Only)
     */
    public function createStaff(Request $request)
    {
        $currentUser = $request->attributes->get('auth_user');
        if ($currentUser && $currentUser->role !== 'admin') {
            return response()->json(['message' => 'Forbidden: Only administrators can create staff accounts.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|string|in:admin,staff,manager',
            'branch' => 'nullable|string|max:150',
            'shift' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:30',
        ]);

        $defaultPermissions = $validated['role'] === 'admin' 
            ? ['*'] 
            : ['manage_products', 'manage_orders', 'view_inventory', 'customer_service'];

        $user = User::create([
            'name' => $validated['name'],
            'email' => strtolower(trim($validated['email'])),
            'password' => Hash::make($validated['password'], ['rounds' => 12]),
            'role' => $validated['role'],
            'branch' => $validated['branch'] ?? 'Phnom Penh Main Branch (សាខាកណ្តាល)',
            'shift' => $validated['shift'] ?? 'Morning Shift (វេនព្រឹក)',
            'phone' => $validated['phone'] ?? null,
            'status' => 'active',
            'permissions' => $defaultPermissions,
            'api_token' => bin2hex(random_bytes(32)),
        ]);

        UserProfile::updateOrCreate(
            ['email' => $user->email],
            [
                'firebase_uid' => 'STAFF_SYS_' . md5($user->email),
                'display_name' => $user->name,
                'is_admin' => true,
                'phone' => $user->phone,
            ]
        );

        return response()->json([
            'message' => 'Staff account created successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'branch' => $user->branch,
                'shift' => $user->shift,
                'phone' => $user->phone,
                'status' => $user->status,
            ],
        ], 201);
    }

    /**
     * Update Staff Account (Admin Only)
     */
    public function updateStaff(Request $request, $id)
    {
        $currentUser = $request->attributes->get('auth_user');
        if ($currentUser && $currentUser->role !== 'admin') {
            return response()->json(['message' => 'Forbidden: Only administrators can update staff accounts.'], 403);
        }

        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'role' => 'sometimes|string|in:admin,staff,manager',
            'branch' => 'nullable|string|max:150',
            'shift' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:30',
            'status' => 'sometimes|string|in:active,inactive',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password'], ['rounds' => 12]);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'Staff account updated successfully',
            'user' => $user->fresh(),
        ]);
    }

    /**
     * Delete Staff Account (Admin Only)
     */
    public function deleteStaff(Request $request, $id)
    {
        $currentUser = $request->attributes->get('auth_user');
        if ($currentUser && $currentUser->role !== 'admin') {
            return response()->json(['message' => 'Forbidden: Only administrators can delete staff.'], 403);
        }

        if ($currentUser && $currentUser->id == $id) {
            return response()->json(['message' => 'You cannot delete your own active admin account.'], 400);
        }

        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'Staff account deleted successfully']);
    }
}
