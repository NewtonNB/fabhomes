<?php

namespace App\Policies;

use App\Models\EquipmentMaintenanceLog;
use App\Models\User;

class MaintenancePolicy
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
            'view equipment', 'manage equipment', 'equipment.view', 'equipment.view-any', 'equipment.maintain'
        ]);
    }

    public function view(User $user, EquipmentMaintenanceLog $log): bool
    {
        return $user->hasAnyPermission([
            'view equipment', 'manage equipment', 'equipment.view', 'equipment.maintain'
        ]);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission([
            'maintain equipment', 'manage equipment', 'equipment.maintain', 'equipment.create'
        ]);
    }

    public function update(User $user, EquipmentMaintenanceLog $log): bool
    {
        return $user->hasAnyPermission([
            'maintain equipment', 'manage equipment', 'equipment.maintain', 'equipment.update'
        ]);
    }

    public function delete(User $user, EquipmentMaintenanceLog $log): bool
    {
        return $user->hasAnyPermission([
            'delete equipment', 'manage equipment', 'equipment.delete'
        ]);
    }
}
