<?php

namespace App\Policies;

use App\Models\User;
use Spatie\Permission\Models\Permission;

class PermissionPolicy
{
    /**
     * Perform pre-authorization checks.
     * Super Admin can perform any action.
     */
    public function before(User $user, string $ability): bool|null
    {
        if ($user->hasRole('Super Admin')) {
            return true;
        }

        return null;
    }

    /**
     * Determine whether the user can view any permissions.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('permissions.view-any');
    }

    /**
     * Determine whether the user can view the permission.
     */
    public function view(User $user, Permission $permission): bool
    {
        return $user->hasPermissionTo('permissions.view');
    }

    /**
     * Determine whether the user can create permissions.
     * This is typically restricted to Super Admin only.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('permissions.create');
    }

    /**
     * Determine whether the user can update the permission.
     * This is typically restricted to Super Admin only.
     */
    public function update(User $user, Permission $permission): bool
    {
        return $user->hasPermissionTo('permissions.update');
    }

    /**
     * Determine whether the user can delete the permission.
     * This is typically restricted to Super Admin only.
     */
    public function delete(User $user, Permission $permission): bool
    {
        // Prevent deletion of permissions that are currently assigned
        if ($permission->users()->count() > 0 || $permission->roles()->count() > 0) {
            return false;
        }

        return $user->hasPermissionTo('permissions.delete');
    }
}
