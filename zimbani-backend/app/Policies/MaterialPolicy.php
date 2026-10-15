<?php

namespace App\Policies;

use App\Models\Material;
use App\Models\User;

class MaterialPolicy
{
    /**
     * Super Admin bypasses all checks.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasRole('Super Admin')) {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->hasAnyPermission([
            'view materials', 'manage materials', 'materials.view', 'materials.view-any', 'materials.view-inventory'
        ]);
    }

    public function view(User $user, Material $material): bool
    {
        return $user->hasAnyPermission([
            'view materials', 'manage materials', 'materials.view', 'materials.view-any'
        ]);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission([
            'create materials', 'manage materials', 'materials.create'
        ]);
    }

    public function update(User $user, Material $material): bool
    {
        return $user->hasAnyPermission([
            'edit materials', 'manage materials', 'materials.update'
        ]);
    }

    public function delete(User $user, Material $material): bool
    {
        return $user->hasAnyPermission([
            'delete materials', 'manage materials', 'materials.delete'
        ]);
    }

    public function adjustStock(User $user, Material $material): bool
    {
        return $user->hasAnyPermission([
            'manage materials', 'materials.update', 'materials.track-usage'
        ]);
    }
}
