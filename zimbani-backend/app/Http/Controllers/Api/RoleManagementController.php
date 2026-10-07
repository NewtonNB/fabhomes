<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\RoleResource;
use App\Http\Resources\PermissionResource;
use App\Traits\LogsActivity;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleManagementController extends Controller
{
    use AuthorizesRequests, LogsActivity;
    /**
     * Display a listing of roles.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Role::class);

        $roles = Role::with('permissions')->withCount('users')->get();

        return response()->json([
            'success' => true,
            'data' => RoleResource::collection($roles)
        ], 200);
    }

    /**
     * Store a newly created role.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $this->authorize('create', Role::class);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:roles,name',
            'permissions' => 'sometimes|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $role = Role::create([
            'name' => $request->name,
            'guard_name' => 'web',
        ]);

        // Assign permissions if provided
        if ($request->has('permissions')) {
            $role->givePermissionTo($request->permissions);
        }

        // Log role creation
        $this->logCreated($role);

        return response()->json([
            'success' => true,
            'message' => 'Role created successfully',
            'data' => new RoleResource($role->load('permissions'))
        ], 201);
    }

    /**
     * Display the specified role.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(int $id)
    {
        $role = Role::with('permissions')->findOrFail($id);
        
        $this->authorize('view', $role);

        return response()->json([
            'success' => true,
            'data' => new RoleResource($role)
        ], 200);
    }

    /**
     * Update the specified role.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, int $id)
    {
        $role = Role::findOrFail($id);
        
        $this->authorize('update', $role);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:roles,name,' . $role->id,
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $oldName = $role->name;
        
        $role->update([
            'name' => $request->name ?? $role->name,
        ]);

        // Log role update
        if ($oldName !== $role->name) {
            $this->logUpdated($role, ['name' => $oldName], ['name' => $role->name]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Role updated successfully',
            'data' => new RoleResource($role)
        ], 200);
    }

    /**
     * Remove the specified role.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(int $id)
    {
        $role = Role::findOrFail($id);
        
        $this->authorize('delete', $role);

        // Log before deletion
        $this->logDeleted($role);

        $role->delete();

        return response()->json([
            'success' => true,
            'message' => 'Role deleted successfully'
        ], 200);
    }

    /**
     * Assign permissions to a role.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function assignPermissions(Request $request, int $id)
    {
        $role = Role::findOrFail($id);
        
        $this->authorize('assignPermissions', $role);

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
        $role->syncPermissions($request->permissions);

        // Log permission assignment
        $this->logPermissionAssignment($role, $request->permissions);

        return response()->json([
            'success' => true,
            'message' => 'Permissions assigned successfully',
            'data' => new RoleResource($role->load('permissions'))
        ], 200);
    }

    /**
     * Get all available permissions.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function permissions()
    {
        $this->authorize('viewAny', Permission::class);

        $permissions = Permission::all()->groupBy(function ($permission) {
            // Group by module (e.g., "users.view" -> "users")
            return explode('.', $permission->name)[0];
        });

        return response()->json([
            'success' => true,
            'data' => $permissions->map(fn($perms) => PermissionResource::collection($perms))
        ], 200);
    }
}
