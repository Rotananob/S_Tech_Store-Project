<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\User;
use App\Services\TelegramService;

class SuperAdminMiddleware
{
    /**
     * Handle an incoming request for Super Admin (System Owner) only operations.
     */
    public function handle(Request $request, Closure $next): Response
    {
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
                $isSuperAdmin = ($user->role === 'super_admin') || ($user->email === 'nobrothana180703@gmail.com');

                if ($isSuperAdmin) {
                    $request->attributes->set('auth_user', $user);
                    return $next($request);
                }

                // Regular Admin / Staff trying to execute Super Admin actions
                try {
                    TelegramService::sendSecurityAlert([
                        'type' => '⛔ ការប៉ុនប៉ងប្រើប្រាស់មហាសិទ្ធិដោយគ្មានការអនុញ្ញាត (Non-Owner Master Attempt)',
                        'ip' => $request->ip() ?? 'Unknown IP',
                        'device' => $request->userAgent() ?? 'Unknown Device',
                        'user' => "{$user->name} ({$user->email}) [Role: {$user->role}]",
                        'action' => 'Access Denied (403 Forbidden)',
                        'details' => "បុគ្គលិក/Admin ធម្មតា បានព្យាយាមដំណើរការប៊ូតុងមហាសិទ្ធិម្ចាស់ប្រព័ន្ធលើ: /" . ltrim($request->path(), '/'),
                    ]);
                } catch (\Throwable $t) {}

                return response()->json([
                    'success' => false,
                    'code' => 'SUPER_ADMIN_REQUIRED',
                    'error' => 'សកម្មភាពនេះត្រូវបានការពារ! មានតែម្ចាស់ប្រព័ន្ធ (Super Admin / System Owner) ប៉ុណ្ណោះដែលមានមហាសិទ្ធិបញ្ជា ឬកែប្រែបាន។',
                    'message' => 'Forbidden: Super Administrator (System Owner) privileges required.',
                ], 403);
            }
        }

        return response()->json([
            'success' => false,
            'code' => 'UNAUTHENTICATED',
            'error' => 'សូម Login ចូលគណនីម្ចាស់ប្រព័ន្ធជាមុនសិន',
            'message' => 'Forbidden: Valid Super Admin session required.',
        ], 403);
    }
}
