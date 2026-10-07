<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Http\Resources\UserCollection;
use App\Models\User;
use App\Traits\LogsActivity;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class UserManagementController extends Controller
{
    use AuthorizesRequests, LogsActivity;
    /**
     * Display a listing of users.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', User::class);

        $perPage = $request->input('per_page', 15);
        $search = $request->input('search');
        $status = $request->input('status');
        $role = $request->input('role');

        $query = User::with(['roles', 'permissions']);

        // Search by name, email, or phone
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Filter by status
        if ($status) {
            $query->where('status', $status);
        }

        // Filter by role
        if ($role) {
            $query->role($role);
        }

        $users = $query->paginate($perPage);

        return (new UserCollection($users))->additional([
            'success' => true,
        ]);
    }

    /**
     * Store a newly created user.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $this->authorize('create', User::class);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'nullable|string|max:20|unique:users',
            'password' => 'required|string|min:8',
            'status' => 'sometimes|in:active,inactive,suspended,pending',
            'roles' => 'sometimes|array',
            'roles.*' => 'exists:roles,name',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::create([
            'uuid' => Str::uuid(),
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'status' => $request->status ?? 'pending',
        ]);

        // Assign roles if provided
        if ($request->has('roles')) {
            $user->assignRole($request->roles);
        }

        // Log user creation
        $this->logCreated($user, ['created_by_admin' => true]);

        return response()->json([
            'success' => true,
            'message' => 'User created successfully',
            'data' => new UserResource($user)
        ], 201);
    }

    /**
     * Display the specified user.
     *
     * @param string $uuid
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(string $uuid)
    {
        $user = User::where('uuid', $uuid)->firstOrFail();
        
        $this->authorize('view', $user);

        return response()->json([
            'success' => true,
            'data' => new UserResource($user)
        ], 200);
    }

    /**
     * Update the specified user.
     *
     * @param Request $request
     * @param string $uuid
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, string $uuid)
    {
        $user = User::where('uuid', $uuid)->firstOrFail();
        
        $this->authorize('update', $user);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'sometimes|nullable|string|max:20|unique:users,phone,' . $user->id,
            'password' => 'sometimes|required|string|min:8',
            'status' => 'sometimes|in:active,inactive,suspended,pending',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->only(['name', 'email', 'phone', 'status']);

        if ($request->has('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $oldValues = $user->only(array_keys($data));
        $user->update($data);

        // Log user update
        $this->logUpdated($user, $oldValues, $user->only(array_keys($data)));

        return response()->json([
            'success' => true,
            'message' => 'User updated successfully',
            'data' => new UserResource($user)
        ], 200);
    }

    /**
     * Remove the specified user (soft delete).
     *
     * @param string $uuid
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(string $uuid)
    {
        $user = User::where('uuid', $uuid)->firstOrFail();
        
        $this->authorize('delete', $user);

        // Log before deletion
        $this->logDeleted($user);

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'User deleted successfully'
        ], 200);
    }

    /**
     * Restore a soft-deleted user.
     *
     * @param string $uuid
     * @return \Illuminate\Http\JsonResponse
     */
    public function restore(string $uuid)
    {
        $user = User::withTrashed()->where('uuid', $uuid)->firstOrFail();
        
        $this->authorize('restore', $user);

        $user->restore();

        // Log restoration
        $this->logRestored($user);

        return response()->json([
            'success' => true,
            'message' => 'User restored successfully',
            'data' => new UserResource($user)
        ], 200);
    }

    /**
     * Assign roles to a user.
     *
     * @param Request $request
     * @param string $uuid
     * @return \Illuminate\Http\JsonResponse
     */
    public function assignRoles(Request $request, string $uuid)
    {
        $user = User::where('uuid', $uuid)->firstOrFail();
        
        $this->authorize('assignRoles', $user);

        $validator = Validator::make($request->all(), [
            'roles' => 'required|array',
            'roles.*' => 'exists:roles,name',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Sync roles (replace existing with new)
        $user->syncRoles($request->roles);

        // Log role assignment
        $this->logRoleAssignment($user, $request->roles);

        return response()->json([
            'success' => true,
            'message' => 'Roles assigned successfully',
            'data' => new UserResource($user)
        ], 200);
    }

    /**
     * Assign permissions to a user.
     *
     * @param Request $request
     * @param string $uuid
     * @return \Illuminate\Http\JsonResponse
     */
    public function assignPermissions(Request $request, string $uuid)
    {
        $user = User::where('uuid', $uuid)->firstOrFail();
        
        $this->authorize('assignPermissions', $user);

        $validator = Validator::make($request->all(), [
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Sync permissions (replace existing with new)
        $user->syncPermissions($request->permissions);

        // Log permission assignment
        $this->logPermissionAssignment($user, $request->permissions);

        return response()->json([
            'success' => true,
            'message' => 'Permissions assigned successfully',
            'data' => new UserResource($user)
        ], 200);
    }
}
