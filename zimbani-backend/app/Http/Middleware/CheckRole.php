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
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        // Universal bypass for Super Admin
        if ($user->hasRole('Super Admin')) {
            return $next($request);
        }

        // Support multiple roles separated by |
        $roles = array_filter(array_map('trim', explode('|', $role)));

        // Check exact match or case-insensitive match
        $userRoles = $user->getRoleNames()->map(fn ($r) => strtolower($r))->toArray();
        $hasRole = false;

        foreach ($roles as $requiredRole) {
            if (in_array(strtolower($requiredRole), $userRoles)) {
                $hasRole = true;
                break;
            }
        }

        if (!$hasRole) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have the required role to perform this action',
                'required_roles' => $roles
            ], 403);
        }

        return $next($request);
    }
}
