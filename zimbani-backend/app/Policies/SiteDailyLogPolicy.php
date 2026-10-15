<?php

namespace App\Policies;

use App\Models\SiteDailyLog;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SiteDailyLogPolicy
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
        return $user->hasPermissionTo('daily-logs.view-any') ||
               $user->hasPermissionTo('daily-logs.view') ||
               $user->hasRole(['Company Admin', 'Site Manager', 'Supervisor']);
    }

    public function view(User $user, SiteDailyLog $log): bool
    {
        return $user->hasPermissionTo('daily-logs.view') ||
               $user->hasRole(['Company Admin', 'Site Manager', 'Supervisor']);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('daily-logs.create') ||
               $user->hasRole(['Company Admin', 'Site Manager', 'Supervisor']);
    }

    public function update(User $user, SiteDailyLog $log): bool
    {
        return $user->hasPermissionTo('daily-logs.update') ||
               $user->id === $log->supervisor_id ||
               $user->hasRole(['Company Admin', 'Site Manager']);
    }

    public function delete(User $user, SiteDailyLog $log): bool
    {
        return $user->hasPermissionTo('daily-logs.delete') ||
               $user->hasRole(['Company Admin', 'Site Manager']);
    }

    public function approve(User $user, SiteDailyLog $log): bool
    {
        return $user->hasPermissionTo('daily-logs.approve') ||
               $user->hasRole(['Company Admin', 'Site Manager']);
    }
}
