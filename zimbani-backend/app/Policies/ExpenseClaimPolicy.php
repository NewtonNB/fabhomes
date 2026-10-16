<?php

namespace App\Policies;

use App\Models\ExpenseClaim;
use App\Models\User;

class ExpenseClaimPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('Super Admin') || $user->hasAnyPermission(['expenses.view', 'expenses.view-any']);
    }

    public function view(User $user, ExpenseClaim $claim): bool
    {
        if ($user->hasRole('Super Admin')) return true;
        if ($user->hasAnyPermission(['expenses.view', 'expenses.view-any'])) return true;
        return $claim->claimant_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->hasRole('Super Admin') || $user->hasPermissionTo('expenses.create');
    }

    public function update(User $user, ExpenseClaim $claim): bool
    {
        if ($user->hasRole('Super Admin')) return true;
        if ($user->hasPermissionTo('expenses.update')) return true;
        return $claim->claimant_id === $user->id && in_array($claim->status, ['draft', 'rejected']);
    }

    public function delete(User $user, ExpenseClaim $claim): bool
    {
        if ($user->hasRole('Super Admin')) return true;
        if ($user->hasPermissionTo('expenses.delete')) return true;
        return $claim->claimant_id === $user->id && $claim->status === 'draft';
    }

    public function verifySite(User $user, ExpenseClaim $claim): bool
    {
        return $user->hasRole('Super Admin') || $user->hasPermissionTo('expenses.verify-site');
    }

    public function approveFinance(User $user, ExpenseClaim $claim): bool
    {
        return $user->hasRole('Super Admin') || $user->hasPermissionTo('expenses.approve-finance');
    }

    public function authorizeAdmin(User $user, ExpenseClaim $claim): bool
    {
        return $user->hasRole('Super Admin') || $user->hasPermissionTo('expenses.authorize-admin');
    }

    public function pay(User $user, ExpenseClaim $claim): bool
    {
        return $user->hasRole('Super Admin') || $user->hasAnyPermission(['expenses.pay', 'expenses.reimburse']);
    }
}
