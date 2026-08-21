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
        $uid = $request->header('X-Firebase-UID');
        
        if (!$uid) {
            return response()->json(['message' => 'Forbidden: Not logged in'], 403);
        }

        // TODO: In the future, check if $uid belongs to a specific admin in the database.
        // For now, allow any logged-in user to access admin tools for the demo/testing.
        return $next($request);
    }
}
