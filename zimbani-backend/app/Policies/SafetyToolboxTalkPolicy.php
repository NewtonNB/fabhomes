<?php

namespace App\Policies;

use App\Models\SafetyToolboxTalk;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SafetyToolboxTalkPolicy
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

    public function view(User $user, SafetyToolboxTalk $talk): bool
    {
        return $user->hasPermissionTo('safety.view') ||
               $user->hasRole(['Company Admin', 'Site Manager', 'Supervisor']);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('safety.create') ||
               $user->hasRole(['Company Admin', 'Site Manager', 'Supervisor']);
    }

    public function update(User $user, SafetyToolboxTalk $talk): bool
    {
        return $user->hasPermissionTo('safety.update') ||
               $user->id === $talk->conducted_by ||
               $user->hasRole(['Company Admin', 'Site Manager']);
    }

    public function delete(User $user, SafetyToolboxTalk $talk): bool
    {
        return $user->hasPermissionTo('safety.delete') ||
               $user->hasRole(['Company Admin', 'Site Manager']);
    }
}
