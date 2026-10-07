<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\Api\RoleManagementController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\CompanyController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public authentication routes (no auth required) with rate limiting
Route::prefix('v1')->group(function () {
    // More restrictive rate limits for authentication endpoints
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('throttle:3,1'); // 3 attempts per minute
    
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1'); // 5 attempts per minute
    
    Route::post('/password/forgot', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:3,1'); // 3 attempts per minute
    
    Route::post('/password/reset', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:3,1'); // 3 attempts per minute
});

// Protected routes (require authentication)
Route::prefix('v1')->middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    // User profile routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);

    // User's own activity logs
    Route::get('/activities/me', [ActivityController::class, 'myActivities']);

    // Company Management routes
    Route::apiResource('companies', CompanyController::class);
    Route::post('/companies/{uuid}/restore', [CompanyController::class, 'restore']);
    Route::get('/companies/{company}/subsidiaries', [CompanyController::class, 'subsidiaries']);
    Route::get('/companies/{company}/users', [CompanyController::class, 'users']);

    // Admin: User Management routes (stricter rate limit)
    Route::prefix('admin')->middleware('throttle:30,1')->group(function () {
        // User management
        Route::get('/users', [UserManagementController::class, 'index']);
        Route::post('/users', [UserManagementController::class, 'store']);
        Route::get('/users/{uuid}', [UserManagementController::class, 'show']);
        Route::put('/users/{uuid}', [UserManagementController::class, 'update']);
        Route::delete('/users/{uuid}', [UserManagementController::class, 'destroy']);
        Route::post('/users/{uuid}/restore', [UserManagementController::class, 'restore']);
        Route::post('/users/{uuid}/roles', [UserManagementController::class, 'assignRoles']);
        Route::post('/users/{uuid}/permissions', [UserManagementController::class, 'assignPermissions']);

        // Role management
        Route::get('/roles', [RoleManagementController::class, 'index']);
        Route::post('/roles', [RoleManagementController::class, 'store']);
        Route::get('/roles/{id}', [RoleManagementController::class, 'show']);
        Route::put('/roles/{id}', [RoleManagementController::class, 'update']);
        Route::delete('/roles/{id}', [RoleManagementController::class, 'destroy']);
        Route::post('/roles/{id}/permissions', [RoleManagementController::class, 'assignPermissions']);

        // Permissions listing
        Route::get('/permissions', [RoleManagementController::class, 'permissions']);

        // Activity logs (Super Admin and Company Admin only)
        Route::get('/activities', [ActivityController::class, 'index']);
        Route::get('/activities/statistics', [ActivityController::class, 'statistics']);
        Route::get('/activities/{id}', [ActivityController::class, 'show']);
        
        // Company statistics
        Route::get('/companies/statistics', [CompanyController::class, 'statistics']);
    });
});
