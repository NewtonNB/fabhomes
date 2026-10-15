<?php

namespace App\Policies;

use App\Models\SafetyIncident;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SafetyIncidentPolicy
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
        return $user->hasPermissionTo('safety.view-any') ||
               $user->hasPermissionTo('safety.view') ||
               $user->hasRole(['Company Admin', 'Site Manager', 'Supervisor']);
    }

    public function view(User $user, SafetyIncident $incident): bool
    {
        return $user->hasPermissionTo('safety.view') ||
               $user->hasRole(['Company Admin', 'Site Manager', 'Supervisor']);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('safety.create') ||
               $user->hasRole(['Company Admin', 'Site Manager', 'Supervisor', 'Worker']);
    }

    public function update(User $user, SafetyIncident $incident): bool
    {
        return $user->hasPermissionTo('safety.update') ||
               $user->id === $incident->reported_by ||
               $user->hasRole(['Company Admin', 'Site Manager', 'Supervisor']);
    }

    public function delete(User $user, SafetyIncident $incident): bool
    {
        return $user->hasPermissionTo('safety.delete') ||
               $user->hasRole(['Company Admin', 'Site Manager']);
    }

    public function investigate(User $user, SafetyIncident $incident): bool
    {
        return $user->hasPermissionTo('safety.investigate') ||
               $user->hasRole(['Company Admin', 'Site Manager', 'Supervisor']);
    }

    public function close(User $user, SafetyIncident $incident): bool
    {
        return $user->hasPermissionTo('safety.close') ||
               $user->hasRole(['Company Admin', 'Site Manager']);
    }
}
