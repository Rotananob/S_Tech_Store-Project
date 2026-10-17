<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\UserProfile;
use App\Models\User;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     * Supports:
     * 1. Authorization: Bearer <token> (Production Admin/Staff token)
     * 2. X-Admin-Token: <token>
     * 3. X-Firebase-UID: <uid> (Firebase authenticated admin)
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Check Bearer Token, X-Admin-Token, or Cookie
        $authHeader = $request->header('Authorization', '');
        $token = null;
        if (str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
        }
        if (!$token) {
            $token = $request->header('X-Admin-Token');
        }
        if (!$token) {
            $token = $request->cookie('stech_admin_token');
        }

        $user = null;
        if ($token) {
            $user = \App\Services\AdminTokenService::validateToken($token);
        }

        // Guaranteed access for authenticated System Owner
        if ($user && strtolower(trim((string)$user->email)) === 'nobrothana180703@gmail.com') {
            if ($user->role !== 'super_admin' || $user->status !== 'active') {
                $user->role = 'super_admin';
                $user->status = 'active';
                $user->save();
            }

            $request->attributes->set('auth_user', $user);
            $response = $next($request);

            if ($token && \App\Services\AdminTokenService::shouldRefreshToken($token)) {
                $refreshed = \App\Services\AdminTokenService::createToken($user);
                $response->headers->set('X-Refreshed-Admin-Token', $refreshed);
            }

            return $response;
        }

        if ($user) {
            // Strict RBAC Verification: User must be admin or staff
            if ($user->isAdmin() || $user->isStaff() || $user->email === 'nobrothana180703@gmail.com') {
                $isSuper = $user->isSuperAdmin() || ($user->email === 'nobrothana180703@gmail.com');

                // Check if Staff Activity Lockdown is armed by System Owner
                $masterState = \Illuminate\Support\Facades\Cache::get('master_system_state') ?: (function() {
                    $row = \Illuminate\Support\Facades\DB::table('system_settings')->where('key', 'master_system_state')->first();
                    return $row && !empty($row->value) ? (is_string($row->value) ? json_decode($row->value, true) : (array)$row->value) : [];
                })();

                if (!empty($masterState['staff_lockdown']) && !$isSuper) {
                    return response()->json([
                        'success' => false,
                        'code' => 'STAFF_LOCKDOWN_ACTIVE',
                        'message' => 'សកម្មភាពបុគ្គលិក និង Admin ទាំងអស់ត្រូវបានផ្អាកបណ្តោះអាសន្នដោយម្ចាស់ប្រព័ន្ធ (System Owner)!',
                        'reason' => $masterState['staff_lockdown_reason'] ?? 'Emergency Staff Lockdown by System Owner',
                    ], 423);
                }

                // Attach authenticated admin/staff user to request attributes
                $request->attributes->set('auth_user', $user);
                $response = $next($request);

                // Auto-refresh token in response header if nearing expiration or legacy
                if ($token && \App\Services\AdminTokenService::shouldRefreshToken($token)) {
                    $refreshed = \App\Services\AdminTokenService::createToken($user);
                    $response->headers->set('X-Refreshed-Admin-Token', $refreshed);
                }

                return $response;
            }

            // Security Alert: Non-privileged user attempting to access admin APIs
            \App\Services\TelegramService::sendSecurityAlert([
                'type' => '🚨 Privilege Escalation Attempt Detected',
                'ip' => $request->ip() ?? 'Unknown IP',
                'device' => $request->userAgent() ?? 'Unknown Device',
                'user' => "{$user->name} ({$user->email}) [Role: {$user->role}]",
                'action' => 'Access Denied (403 Forbidden)',
                'details' => "Non-admin account attempted to execute administrative action on: /" . ltrim($request->path(), '/'),
            ]);

            return response()->json([
                'message' => 'Forbidden: Administrative privileges required',
            ], 403);
        }

        // Probing / Scanner Rate Limiting & Alerting
        $probeKey = 'admin_probe:' . $request->ip();
        $probes = (int)\Illuminate\Support\Facades\Cache::get($probeKey, 0) + 1;
        \Illuminate\Support\Facades\Cache::put($probeKey, $probes, 60);

        if ($probes === 3 || $probes === 10) {
            \App\Services\TelegramService::sendSecurityAlert([
                'type' => '🚨 Unauthorized Admin API Probing / Scanner',
                'ip' => $request->ip() ?? 'Unknown IP',
                'device' => $request->userAgent() ?? 'Scanner Bot',
                'user' => 'Probe on /' . ltrim($request->path(), '/'),
                'action' => 'Access Denied (403)',
                'details' => "Detected {$probes} unauthorized requests to protected admin API endpoints without valid credentials.",
            ]);
        }

        return response()->json([
            'message' => 'Unauthenticated: Invalid or expired admin session',
            'code' => 'UNAUTHENTICATED',
        ], 401);
    }
}
