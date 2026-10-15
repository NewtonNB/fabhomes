<?php

namespace App\Policies;

use App\Models\EquipmentDispatch;
use App\Models\User;

class DispatchPolicy
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
            'view equipment', 'manage equipment', 'equipment.view', 'equipment.view-any', 'equipment.dispatch'
        ]);
    }

    public function view(User $user, EquipmentDispatch $dispatch): bool
    {
        return $user->hasAnyPermission([
            'view equipment', 'manage equipment', 'equipment.view', 'equipment.dispatch'
        ]);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission([
            'dispatch equipment', 'manage equipment', 'equipment.dispatch', 'equipment.create'
        ]);
    }

    public function update(User $user, EquipmentDispatch $dispatch): bool
    {
        return $user->hasAnyPermission([
            'dispatch equipment', 'manage equipment', 'equipment.dispatch', 'equipment.update'
        ]);
    }

    public function delete(User $user, EquipmentDispatch $dispatch): bool
    {
        return $user->hasAnyPermission([
            'delete equipment', 'manage equipment', 'equipment.delete'
        ]);
    }
}
