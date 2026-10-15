<?php

namespace App\Policies;

use App\Models\EquipmentUtilizationLog;
use App\Models\User;

class UtilizationPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasRole('Super Admin')) {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->hasAnyPermission([
            'view equipment', 'manage equipment', 'equipment.view', 'equipment.view-any', 'equipment.log-utilization'
        ]);
    }

    public function view(User $user, EquipmentUtilizationLog $log): bool
    {
        return $user->hasAnyPermission([
            'view equipment', 'manage equipment', 'equipment.view', 'equipment.log-utilization'
        ]);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission([
            'log equipment utilization', 'manage equipment', 'equipment.log-utilization', 'equipment.create'
        ]);
    }

    public function delete(User $user, EquipmentUtilizationLog $log): bool
    {
        return $user->hasAnyPermission([
            'delete equipment', 'manage equipment', 'equipment.delete'
        ]);
    }
}
