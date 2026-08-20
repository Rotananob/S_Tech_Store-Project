<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Simple admin check: Ensure user is authenticated and has an admin role or flag.
        // Assuming we rely on is_admin property on the user. If it doesn't exist, this will default to false unless explicitly set.
        if ($request->user() && $request->user()->is_admin) {
            return $next($request);
        }

        return response()->json(['message' => 'Forbidden: Admins only'], 403);
    }
}
