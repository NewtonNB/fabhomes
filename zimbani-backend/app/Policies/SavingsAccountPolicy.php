<?php

namespace App\Policies;

use App\Models\SavingsAccount;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SavingsAccountPolicy
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
        return $user->hasAnyPermission(['accounts.view-any', 'accounts.view']);
    }

    public function view(User $user, SavingsAccount $account): bool
    {
        // Client can view their own savings account
        if ($user->hasRole('Client')) {
            return $user->client && $user->client->id === $account->client_id;
        }

        return $user->hasAnyPermission(['accounts.view-any', 'accounts.view']);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('accounts.create');
    }

    public function update(User $user, SavingsAccount $account): bool
    {
        return $user->hasPermissionTo('accounts.update');
    }

    public function delete(User $user, SavingsAccount $account): bool
    {
        return $user->hasPermissionTo('accounts.delete');
    }

    public function activate(User $user, SavingsAccount $account): bool
    {
        return $user->hasPermissionTo('accounts.activate');
    }

    public function suspend(User $user, SavingsAccount $account): bool
    {
        return $user->hasPermissionTo('accounts.suspend');
    }

    public function close(User $user, SavingsAccount $account): bool
    {
        return $user->hasPermissionTo('accounts.close');
    }

    public function adjustBalance(User $user, SavingsAccount $account): bool
    {
        return $user->hasPermissionTo('accounts.adjust-balance');
    }

    public function statement(User $user, SavingsAccount $account): bool
    {
        if ($user->hasRole('Client')) {
            return $user->client && $user->client->id === $account->client_id;
        }

        return $user->hasAnyPermission(['accounts.statement', 'accounts.view']);
    }
}
