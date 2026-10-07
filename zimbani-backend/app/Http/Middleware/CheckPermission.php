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
     * @param  string  $permission
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        if (!$request->user()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        if (!$request->user()->hasPermissionTo($permission)) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to perform this action',
                'required_permission' => $permission
            ], 403);
        }

        return $next($request);
    }
}
