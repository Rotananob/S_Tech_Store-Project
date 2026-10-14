<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Branch;
use App\Models\Shift;
use App\Services\TelegramService;

class AdminAuthController extends Controller
{
    /**
     * Admin/Staff Login
     * High security: bcrypt password checking + rate limiting (5 attempts/min) + Telegram Red Team Alerts
     */
    public function login(Request $request)
    {
        $ip = $request->ip() ?? '127.0.0.1';
        $userAgent = $request->userAgent() ?? 'Unknown Agent';
        $throttleKey = 'admin-login:' . $ip;

        // 1. Red Team & SQL Injection / XSS Payload Detection
        $rawEmail = (string)$request->input('email', '');
        $rawPassword = (string)$request->input('password', '');
        $sqliPatterns = ["'", '"', '--', '/*', '*/', 'UNION', 'SELECT', 'OR 1=1', 'DROP', 'INSERT', '<script', 'alert('];
        $detectedPayload = false;
        foreach ($sqliPatterns as $pattern) {
            if (stripos($rawEmail, $pattern) !== false || stripos($rawPassword, $pattern) !== false) {
                $detectedPayload = true;
                break;
            }
        }

        if ($detectedPayload) {
            RateLimiter::hit($throttleKey, 300); // 5-minute penalty
            TelegramService::sendSecurityAlert([
                'type' => '🚨 SQL Injection / XSS Exploit Attempt',
                'ip' => $ip,
                'device' => $userAgent,
                'user' => 'Red Team / Attacker (' . htmlspecialchars(substr($rawEmail, 0, 50)) . ')',
                'action' => 'BLOCKED (Immediate Penalty & Logged)',
                'details' => 'Detected suspicious SQLi/XSS injection signature in admin login parameters.',
            ]);
            return response()->json([
                'message' => 'Malicious payload signature detected. Incident reported to security team.',
            ], 403);
        }

        // 2. Rate Limiting & Brute-Force Alert
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            TelegramService::sendSecurityAlert([
                'type' => '💥 Admin Login Brute-Force Attack',
                'ip' => $ip,
                'device' => $userAgent,
                'user' => 'Target Email: ' . htmlspecialchars(substr($rawEmail, 0, 50)),
                'action' => "RATE LIMITED (Blocked for {$seconds}s)",
                'details' => "Repeated failed login attempts exceeded limit (5 attempts/min). IP temporarily banned.",
            ]);
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
            $attempts = RateLimiter::hit($throttleKey, 60);

            // Alert on repeated failures (>= 3 attempts)
            if ($attempts >= 3) {
                TelegramService::sendSecurityAlert([
                    'type' => '⚠️ Suspicious Failed Admin Logins (' . $attempts . 'x)',
                    'ip' => $ip,
                    'device' => $userAgent,
                    'user' => 'Attempted Email: ' . htmlspecialchars($validated['email']),
                    'action' => 'Credentials Rejected (401)',
                    'details' => "Multiple consecutive password failures from this IP address ({$attempts} attempts).",
                ]);
            }

            return response()->json([
                'message' => 'Invalid email or password. Access denied.',
            ], 401);
        }

        if ($user->status !== 'active') {
            TelegramService::sendSecurityAlert([
                'type' => '🚫 Inactive Admin Account Access Attempt',
                'ip' => $ip,
                'device' => $userAgent,
                'user' => $user->name . ' (' . $user->email . ')',
                'action' => 'Account Deactivated (403)',
                'details' => 'User attempted login to a deactivated staff/admin account.',
            ]);
            return response()->json([
                'message' => 'This account has been deactivated. Please contact the administrator.',
            ], 403);
        }

        RateLimiter::clear($throttleKey);

        // Audit Trail: Notify Telegram of successful Admin Login
        TelegramService::sendSecurityAlert([
            'type' => '✅ Admin / Staff Authenticated',
            'ip' => $ip,
            'device' => $userAgent,
            'user' => "{$user->name} ({$user->role})",
            'action' => 'AUTHORIZED (Session Granted)',
            'details' => "Admin successfully logged into the management portal at " . date('d-m-Y H:i:s'),
        ]);

        // Ensure admin account is named 'Admin' / 'S Tech Admin' (Super Admin is reserved exclusively for System Owner)
        if ($user->role !== 'super_admin' && (stripos($user->name, 'super admin') !== false || stripos($user->name, 'super_admin') !== false)) {
            $user->name = trim(str_ireplace(['Super Admin', 'super_admin'], 'Admin', $user->name)) ?: 'S Tech Admin';
        }

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
                'permissions' => $user->permissions ?? (in_array($user->role, ['admin', 'super_admin']) ? ['*'] : ['manage_products', 'manage_orders', 'view_inventory']),
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
        if ($currentUser && !in_array($currentUser->role, ['admin', 'super_admin'])) {
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
        if ($currentUser && !in_array($currentUser->role, ['admin', 'super_admin'])) {
            return response()->json(['message' => 'Forbidden: Only administrators can create staff accounts.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|string|in:super_admin,admin,staff,manager',
            'branch' => 'nullable|string|max:150',
            'shift' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:30',
        ]);

        if ($validated['role'] === 'super_admin' && ($currentUser->role ?? '') !== 'super_admin') {
            return response()->json(['message' => 'Forbidden: Only Super-Admin / System Owner can create another Super-Admin.'], 403);
        }

        $defaultPermissions = in_array($validated['role'], ['admin', 'super_admin'])
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
        if ($currentUser && !in_array($currentUser->role, ['admin', 'super_admin'])) {
            return response()->json(['message' => 'Forbidden: Only administrators can update staff accounts.'], 403);
        }

        $user = User::findOrFail($id);

        // Protected: normal admin cannot edit super_admin
        if ($user->role === 'super_admin' && ($currentUser->role ?? '') !== 'super_admin') {
            return response()->json(['message' => 'Forbidden: You cannot modify the Super-Admin / System Owner account.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'role' => 'sometimes|string|in:super_admin,admin,staff,manager',
            'branch' => 'nullable|string|max:150',
            'shift' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:30',
            'status' => 'sometimes|string|in:active,inactive',
        ]);

        if (isset($validated['role']) && $validated['role'] === 'super_admin' && ($currentUser->role ?? '') !== 'super_admin') {
            return response()->json(['message' => 'Forbidden: Only Super-Admin can promote to Super-Admin.'], 403);
        }

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
        if ($currentUser && !in_array($currentUser->role, ['admin', 'super_admin'])) {
            return response()->json(['message' => 'Forbidden: Only administrators can delete staff.'], 403);
        }

        if ($currentUser && $currentUser->id == $id) {
            return response()->json(['message' => 'You cannot delete your own active admin account.'], 400);
        }

        $user = User::findOrFail($id);

        // Strictly protect super_admin / owner from deletion
        if ($user->role === 'super_admin' || $user->email === 'nobrothana180703@gmail.com') {
            return response()->json(['message' => 'Forbidden: Super-Admin (គណនីម្ចាស់ប្រព័ន្ធ) cannot be deleted.'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'Staff account deleted successfully']);
    }
}
