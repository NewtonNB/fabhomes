<?php

namespace App\Policies;

use App\Models\MobileMoneyTransaction;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class MobileMoneyTransactionPolicy
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
        return $user->hasAnyRole(['admin', 'super_admin', 'finance_officer', 'finance_manager', 'site_manager', 'client']);
    }

    public function view(User $user, MobileMoneyTransaction $tx): bool
    {
        if ($user->hasRole('client')) {
            return $tx->client_id === $user->client?->id;
        }
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'super_admin', 'finance_officer', 'finance_manager', 'client']);
    }

    public function disburse(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'super_admin', 'finance_manager', 'finance_officer']);
    }
}
