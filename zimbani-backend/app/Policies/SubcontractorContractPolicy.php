<?php

namespace App\Policies;

use App\Models\SubcontractorContract;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SubcontractorContractPolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasRole('Super Admin')) {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->hasAnyPermission(['contracts.view-any', 'contracts.view']);
    }

    public function view(User $user, SubcontractorContract $contract): bool
    {
        return $user->hasAnyPermission(['contracts.view-any', 'contracts.view']);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('contracts.create');
    }

    public function update(User $user, SubcontractorContract $contract): bool
    {
        return $user->hasPermissionTo('contracts.update');
    }

    public function delete(User $user, SubcontractorContract $contract): bool
    {
        return $user->hasPermissionTo('contracts.delete');
    }

    public function sign(User $user, SubcontractorContract $contract): bool
    {
        return $user->hasPermissionTo('contracts.sign');
    }

    public function approve(User $user, SubcontractorContract $contract): bool
    {
        return $user->hasPermissionTo('contracts.approve');
    }

    public function terminate(User $user, SubcontractorContract $contract): bool
    {
        return $user->hasPermissionTo('contracts.terminate');
    }
}
