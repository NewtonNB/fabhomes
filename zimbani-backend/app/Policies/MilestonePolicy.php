<?php

namespace App\Policies;

use App\Models\ConstructionMilestone;
use App\Models\User;

class MilestonePolicy
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
            'projects.view', 'projects.view-any', 'sites.view-progress', 'construction:read'
        ]);
    }

    public function view(User $user, ConstructionMilestone $milestone): bool
    {
        return $user->hasAnyPermission([
            'projects.view', 'projects.view-any', 'sites.view-progress', 'construction:read'
        ]);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission([
            'projects.create', 'projects.update', 'construction:update'
        ]);
    }

    public function update(User $user, ConstructionMilestone $milestone): bool
    {
        return $user->hasAnyPermission([
            'projects.update', 'sites.update-progress', 'construction:update'
        ]);
    }

    public function delete(User $user, ConstructionMilestone $milestone): bool
    {
        return $user->hasAnyPermission([
            'projects.delete', 'projects.update', 'construction:update'
        ]);
    }
}
