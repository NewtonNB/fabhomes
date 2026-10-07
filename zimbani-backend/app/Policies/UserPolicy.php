<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

class UserPolicy
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

        return null; // Continue with normal policy checks
    }

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('users.view-any');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, User $model): bool
    {
        // Users can view their own profile, or need permission to view others
        return $user->id === $model->id || $user->hasPermissionTo('users.view');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('users.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, User $model): bool
    {
        // Users can update their own profile, or need permission to update others
        return $user->id === $model->id || $user->hasPermissionTo('users.update');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, User $model): bool
    {
        // Users cannot delete themselves
        if ($user->id === $model->id) {
            return false;
        }

        return $user->hasPermissionTo('users.delete');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, User $model): bool
    {
        return $user->hasPermissionTo('users.restore');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, User $model): bool
    {
        // Users cannot force delete themselves
        if ($user->id === $model->id) {
            return false;
        }

        return $user->hasPermissionTo('users.force-delete');
    }

    /**
     * Determine whether the user can assign roles to the model.
     */
    public function assignRoles(User $user, User $model): bool
    {
        // Users cannot change their own roles
        if ($user->id === $model->id) {
            return false;
        }

        return $user->hasPermissionTo('users.assign-roles');
    }

    /**
     * Determine whether the user can assign permissions to the model.
     */
    public function assignPermissions(User $user, User $model): bool
    {
        // Users cannot change their own permissions
        if ($user->id === $model->id) {
            return false;
        }

        return $user->hasPermissionTo('users.assign-permissions');
    }
}
