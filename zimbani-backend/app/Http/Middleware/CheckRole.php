<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     * @param  string  $role
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        if (!$request->user()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        // Support multiple roles separated by |
        $roles = explode('|', $role);

        if (!$request->user()->hasAnyRole($roles)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have the required role to perform this action',
                'required_roles' => $roles
            ], 403);
        }

        return $next($request);
    }
}
