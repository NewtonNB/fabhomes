<?php

namespace App\Policies;

use App\Models\PettyCashAccount;
use App\Models\User;

class PettyCashAccountPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('Super Admin') || $user->hasAnyPermission(['petty-cash.view', 'petty-cash.view-any']);
    }

    public function view(User $user, PettyCashAccount $account): bool
    {
        if ($user->hasRole('Super Admin')) return true;
        if ($user->hasAnyPermission(['petty-cash.view', 'petty-cash.view-any'])) return true;
        return $account->custodian_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasRole('Super Admin') || $user->hasPermissionTo('petty-cash.create');
    }

    public function update(User $user, PettyCashAccount $account): bool
    {
        return $user->hasRole('Super Admin') || $user->hasPermissionTo('petty-cash.update');
    }

    public function delete(User $user, PettyCashAccount $account): bool
    {
        return $user->hasRole('Super Admin') || $user->hasPermissionTo('petty-cash.delete');
    }

    public function topUp(User $user, PettyCashAccount $account): bool
    {
        return $user->hasRole('Super Admin') || $user->hasPermissionTo('petty-cash.top-up');
    }

    public function reconcile(User $user, PettyCashAccount $account): bool
    {
        if ($user->hasRole('Super Admin')) return true;
        return $user->hasPermissionTo('petty-cash.reconcile') || $account->custodian_id === $user->id;
    }
}
