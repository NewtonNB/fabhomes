<?php

namespace App\Policies;

use App\Models\PunchListItem;
use App\Models\User;

class PunchListItemPolicy
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
            'view defects', 'manage defects', 'defects.view', 'defects.view-any'
        ]);
    }

    public function view(User $user, PunchListItem $item): bool
    {
        return $user->hasAnyPermission([
            'view defects', 'manage defects', 'defects.view', 'defects.view-any'
        ]) || $item->assigned_to === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission([
            'create defects', 'manage defects', 'defects.create'
        ]);
    }

    public function update(User $user, PunchListItem $item): bool
    {
        return $user->hasAnyPermission([
            'update defects', 'manage defects', 'defects.update'
        ]) || $item->assigned_to === $user->id;
    }

    public function delete(User $user, PunchListItem $item): bool
    {
        return $user->hasAnyPermission([
            'delete defects', 'manage defects', 'defects.delete'
        ]);
    }

    public function verify(User $user, PunchListItem $item): bool
    {
        return $user->hasAnyPermission([
            'verify defects', 'manage defects', 'defects.verify'
        ]);
    }
}
