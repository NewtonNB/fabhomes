<?php

namespace App\Policies;

use App\Models\RetentionFund;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class RetentionFundPolicy
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
        return $user->hasAnyRole(['Super Admin', 'Company Admin', 'Finance Officer', 'Site Manager', 'Client']);
    }

    public function view(User $user, RetentionFund $fund): bool
    {
        if ($user->hasRole('Client')) {
            return $user->client && $user->client->id === $fund->client_id;
        }

        return $user->hasAnyRole(['Super Admin', 'Company Admin', 'Finance Officer', 'Site Manager']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['Super Admin', 'Company Admin', 'Finance Officer']);
    }

    public function update(User $user, RetentionFund $fund): bool
    {
        return $user->hasAnyRole(['Super Admin', 'Company Admin', 'Finance Officer', 'Site Manager']);
    }

    public function delete(User $user, RetentionFund $fund): bool
    {
        return $user->hasAnyRole(['Super Admin', 'Company Admin']);
    }
}
