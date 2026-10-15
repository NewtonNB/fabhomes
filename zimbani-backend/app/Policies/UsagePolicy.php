<?php

namespace App\Policies;

use App\Models\MaterialUsage;
use App\Models\User;

class UsagePolicy
{
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
            'view materials', 'manage materials', 'materials.view', 'materials.view-any', 'materials.track-usage'
        ]);
    }

    public function view(User $user, MaterialUsage $usage): bool
    {
        return $user->hasAnyPermission([
            'view materials', 'manage materials', 'materials.view', 'materials.track-usage'
        ]);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission([
            'track material usage', 'manage materials', 'materials.track-usage', 'materials.create'
        ]);
    }

    public function delete(User $user, MaterialUsage $usage): bool
    {
        return $user->hasAnyPermission([
            'delete materials', 'manage materials', 'materials.delete'
        ]);
    }
}
