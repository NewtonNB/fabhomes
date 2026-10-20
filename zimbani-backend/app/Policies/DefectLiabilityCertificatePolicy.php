<?php

namespace App\Policies;

use App\Models\DefectLiabilityCertificate;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class DefectLiabilityCertificatePolicy
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

    public function view(User $user, DefectLiabilityCertificate $cert): bool
    {
        if ($user->hasRole('Client')) {
            return $user->client && $user->client->id === $cert->client_id;
        }

        return $user->hasAnyRole(['Super Admin', 'Company Admin', 'Finance Officer', 'Site Manager']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['Super Admin', 'Company Admin', 'Finance Officer', 'Site Manager']);
    }

    public function update(User $user, DefectLiabilityCertificate $cert): bool
    {
        return $user->hasAnyRole(['Super Admin', 'Company Admin', 'Finance Officer', 'Site Manager', 'Client']);
    }

    public function delete(User $user, DefectLiabilityCertificate $cert): bool
    {
        return $user->hasAnyRole(['Super Admin', 'Company Admin']);
    }
}
