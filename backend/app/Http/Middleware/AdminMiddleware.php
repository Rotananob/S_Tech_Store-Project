<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\UserProfile;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     * Validates Firebase UID and checks if the user has admin privileges in the DB.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $uid = $request->header('X-Firebase-UID');

        if (!$uid) {
            return response()->json(['message' => 'Forbidden: Not authenticated'], 403);
        }

        // Check if the user is an admin in the database
        $profile = UserProfile::where('firebase_uid', $uid)->first();
        if (!$profile || !$profile->is_admin) {
            return response()->json(['message' => 'Forbidden: Admin access required'], 403);
        }

        return $next($request);
    }
}
