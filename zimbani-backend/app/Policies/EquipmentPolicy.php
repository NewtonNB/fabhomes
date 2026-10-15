<?php

namespace App\Policies;

use App\Models\Equipment;
use App\Models\User;

class EquipmentPolicy
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
            'view equipment', 'manage equipment', 'equipment.view', 'equipment.view-any'
        ]);
    }

    public function view(User $user, Equipment $equipment): bool
    {
        return $user->hasAnyPermission([
            'view equipment', 'manage equipment', 'equipment.view', 'equipment.view-any'
        ]);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission([
            'create equipment', 'manage equipment', 'equipment.create'
        ]);
    }

    public function update(User $user, Equipment $equipment): bool
    {
        return $user->hasAnyPermission([
            'update equipment', 'manage equipment', 'equipment.update'
        ]);
    }

    public function delete(User $user, Equipment $equipment): bool
    {
        return $user->hasAnyPermission([
            'delete equipment', 'manage equipment', 'equipment.delete'
        ]);
    }

    public function dispatch(User $user): bool
    {
        return $user->hasAnyPermission([
            'dispatch equipment', 'manage equipment', 'equipment.dispatch', 'equipment.update'
        ]);
    }

    public function maintain(User $user): bool
    {
        return $user->hasAnyPermission([
            'maintain equipment', 'manage equipment', 'equipment.maintain', 'equipment.update'
        ]);
    }

    public function logUtilization(User $user): bool
    {
        return $user->hasAnyPermission([
            'log equipment utilization', 'manage equipment', 'equipment.log-utilization', 'equipment.update'
        ]);
    }
}
