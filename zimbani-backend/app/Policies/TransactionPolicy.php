<?php

namespace App\Policies;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class TransactionPolicy
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
        return $user->hasAnyPermission(['transactions.view-any', 'transactions.view']);
    }

    public function view(User $user, Transaction $transaction): bool
    {
        // Client can view transactions associated with their profile
        if ($user->hasRole('Client')) {
            return $user->client && $user->client->id === $transaction->client_id;
        }

        return $user->hasAnyPermission(['transactions.view-any', 'transactions.view']);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('transactions.create');
    }

    public function reverse(User $user, Transaction $transaction): bool
    {
        return $user->hasPermissionTo('transactions.reverse');
    }

    public function reconcile(User $user): bool
    {
        return $user->hasPermissionTo('transactions.reconcile');
    }

    public function export(User $user): bool
    {
        return $user->hasPermissionTo('transactions.export');
    }
}
