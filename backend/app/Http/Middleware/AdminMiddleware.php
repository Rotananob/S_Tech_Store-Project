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
        // 1. Check Bearer Token or X-Admin-Token
        $authHeader = $request->header('Authorization', '');
        $token = null;
        if (str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
        }
        if (!$token) {
            $token = $request->header('X-Admin-Token');
        }

        if ($token) {
            $user = User::where('api_token', $token)
                ->where('status', 'active')
                ->first();

            if ($user) {
                // Strict RBAC Verification: User must be admin or staff
                if ($user->isAdmin() || $user->isStaff()) {
                    // Attach authenticated admin/staff user to request attributes
                    $request->attributes->set('auth_user', $user);
                    return $next($request);
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
            'message' => 'Forbidden: Not authenticated or invalid admin session',
        ], 403);
    }
}
