<?php

namespace App\Policies;

use App\Models\User;
use Spatie\Permission\Models\Role;

class RolePolicy
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
     * Determine whether the user can view any roles.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('roles.view-any');
    }

    /**
     * Determine whether the user can view the role.
     */
    public function view(User $user, Role $role): bool
    {
        return $user->hasPermissionTo('roles.view');
    }

    /**
     * Determine whether the user can create roles.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('roles.create');
    }

    /**
     * Determine whether the user can update the role.
     */
    public function update(User $user, Role $role): bool
    {
        // Prevent modification of Super Admin role by non-Super Admins
        if ($role->name === 'Super Admin' && !$user->hasRole('Super Admin')) {
            return false;
        }

        return $user->hasPermissionTo('roles.update');
    }

    /**
     * Determine whether the user can delete the role.
     */
    public function delete(User $user, Role $role): bool
    {
        // Prevent deletion of Super Admin role
        if ($role->name === 'Super Admin') {
            return false;
        }

        // Prevent deletion of roles that are currently assigned to users
        if ($role->users()->count() > 0) {
            return false;
        }

        return $user->hasPermissionTo('roles.delete');
    }

    /**
     * Determine whether the user can assign permissions to the role.
     */
    public function assignPermissions(User $user, Role $role): bool
    {
        // Prevent modification of Super Admin role permissions by non-Super Admins
        if ($role->name === 'Super Admin' && !$user->hasRole('Super Admin')) {
            return false;
        }

        return $user->hasPermissionTo('roles.assign-permissions');
    }
}
