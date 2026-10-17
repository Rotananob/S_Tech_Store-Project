<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Cache;
use App\Models\User;
use App\Services\TelegramService;

class SuperAdminMiddleware
{
    /**
     * Handle an incoming request for Super Admin (System Owner) only operations.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // 1. Token Extraction & Cryptographic Validation
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

        // 2. If authenticated user is System Owner, grant immediate Super Admin access
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
            $isSuperAdmin = in_array($user->role, ['super_admin', 'admin']);

            if ($isSuperAdmin) {
                $request->attributes->set('auth_user', $user);
                $response = $next($request);

                if ($token && \App\Services\AdminTokenService::shouldRefreshToken($token)) {
                    $refreshed = \App\Services\AdminTokenService::createToken($user);
                    $response->headers->set('X-Refreshed-Admin-Token', $refreshed);
                }

                return $response;
            }

            // Regular Admin / Staff trying to execute Super Admin actions
            try {
                TelegramService::sendSecurityAlert([
                    'type' => 'ការប៉ុនប៉ងប្រើប្រាស់សិទ្ធិម្ចាស់ប្រព័ន្ធដោយគ្មានការអនុញ្ញាត (Unauthorized Owner Attempt)',
                    'ip' => $request->ip() ?? 'Unknown IP',
                    'device' => $request->userAgent() ?? 'Unknown Device',
                    'user' => "{$user->name} ({$user->email}) [Role: {$user->role}]",
                    'action' => 'Access Denied (403 Forbidden)',
                    'details' => "បុគ្គលិក/Admin ធម្មតា បានព្យាយាមដំណើរការមុខងារម្ចាស់ប្រព័ន្ធលើ: /" . ltrim($request->path(), '/'),
                ]);
            } catch (\Throwable $t) {}

            return response()->json([
                'success' => false,
                'code' => 'SUPER_ADMIN_REQUIRED',
                'error' => 'សកម្មភាពនេះត្រូវបានការពារ! មានតែម្ចាស់ប្រព័ន្ធ (Super Admin / System Owner) ប៉ុណ្ណោះដែលមានសិទ្ធិបញ្ជា ឬកែប្រែបាន។',
                'message' => 'Forbidden: Super Administrator (System Owner) privileges required.',
            ], 403);
        }

        return response()->json([
            'success' => false,
            'code' => 'UNAUTHENTICATED',
            'error' => 'សូម Login ចូលគណនីម្ចាស់ប្រព័ន្ធជាមុនសិន',
            'message' => 'Forbidden: Valid Super Admin session required.',
        ], 401);
    }
}
