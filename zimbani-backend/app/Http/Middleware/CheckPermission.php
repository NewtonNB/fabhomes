<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     * @param  string  $permission Pipe-delimited list of permissions
     */
    public function handle(Request $request, Closure $next, string $permission): Response
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

        // Support multiple permissions separated by |
        $permissions = explode('|', $permission);
        $hasPermission = false;

        foreach ($permissions as $p) {
            $trimmed = trim($p);
            if (empty($trimmed)) {
                continue;
            }

            try {
                if ($user->can($trimmed) || $user->hasPermissionTo($trimmed)) {
                    $hasPermission = true;
                    break;
                }
            } catch (\Throwable $e) {
                if ($user->getAllPermissions()->pluck('name')->contains($trimmed)) {
                    $hasPermission = true;
                    break;
                }
            }
        }

        if (!$hasPermission) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to perform this action',
                'required_permission' => $permission
            ], 403);
        }

        return $next($request);
    }
}
