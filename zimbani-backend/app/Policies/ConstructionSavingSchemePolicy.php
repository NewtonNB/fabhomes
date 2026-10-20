<?php

namespace App\Policies;

use App\Models\ConstructionSavingScheme;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ConstructionSavingSchemePolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasRole('admin') || $user->hasRole('super_admin')) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'super_admin', 'finance_officer', 'finance_manager', 'site_manager', 'project_manager', 'client']);
    }

    public function view(User $user, ConstructionSavingScheme $scheme): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'super_admin', 'finance_manager', 'finance_officer']);
    }

    public function update(User $user, ConstructionSavingScheme $scheme): bool
    {
        return $user->hasAnyRole(['admin', 'super_admin', 'finance_manager']);
    }

    public function delete(User $user, ConstructionSavingScheme $scheme): bool
    {
        return $user->hasAnyRole(['admin', 'super_admin']);
    }
}
