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
                // Attach user to request attributes
                $request->attributes->set('auth_user', $user);
                return $next($request);
            }
        }

        // 2. Fallback to Firebase UID
        $uid = $request->header('X-Firebase-UID');
        if ($uid) {
            $profile = UserProfile::where('firebase_uid', $uid)->first();
            if ($profile && $profile->is_admin) {
                // Try to find matching User record
                $user = User::where('email', $profile->email)->first();
                if ($user) {
                    $request->attributes->set('auth_user', $user);
                } else {
                    // Create lightweight mock User object for attributes
                    $mockUser = new User([
                        'name' => $profile->display_name ?? 'Admin',
                        'email' => $profile->email ?? 'admin@stechstore.com',
                        'role' => 'admin',
                        'status' => 'active',
                    ]);
                    $mockUser->id = 1;
                    $request->attributes->set('auth_user', $mockUser);
                }
                return $next($request);
            }

            return response()->json([
                'message' => 'Forbidden: Admin access required',
            ], 403);
        }

        return response()->json([
            'message' => 'Forbidden: Not authenticated',
        ], 403);
    }
}
