<?php

namespace App\Policies;

use App\Models\SiteInspection;
use App\Models\User;

class SiteInspectionPolicy
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
            'view inspections', 'manage inspections', 'inspections.view', 'inspections.view-any'
        ]);
    }

    public function view(User $user, SiteInspection $inspection): bool
    {
        return $user->hasAnyPermission([
            'view inspections', 'manage inspections', 'inspections.view', 'inspections.view-any'
        ]);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission([
            'create inspections', 'manage inspections', 'inspections.create'
        ]);
    }

    public function update(User $user, SiteInspection $inspection): bool
    {
        return $user->hasAnyPermission([
            'update inspections', 'manage inspections', 'inspections.update'
        ]);
    }

    public function delete(User $user, SiteInspection $inspection): bool
    {
        return $user->hasAnyPermission([
            'delete inspections', 'manage inspections', 'inspections.delete'
        ]);
    }

    public function signOff(User $user, SiteInspection $inspection): bool
    {
        return $user->hasAnyPermission([
            'sign-off inspections', 'inspections.sign-off', 'manage inspections'
        ]);
    }
}
