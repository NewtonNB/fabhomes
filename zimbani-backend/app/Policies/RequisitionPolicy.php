<?php

namespace App\Policies;

use App\Models\MaterialRequisition;
use App\Models\User;

class RequisitionPolicy
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
            'view materials', 'manage materials', 'materials.view', 'materials.view-any', 'materials.request'
        ]);
    }

    public function view(User $user, MaterialRequisition $req): bool
    {
        if ($req->requested_by === $user->id) {
            return true;
        }

        return $user->hasAnyPermission([
            'view materials', 'manage materials', 'materials.view', 'materials.view-any'
        ]);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission([
            'request materials', 'manage materials', 'materials.request', 'materials.create'
        ]);
    }

    public function update(User $user, MaterialRequisition $req): bool
    {
        // Requester can update their own pending requisition
        if ($req->requested_by === $user->id && $req->status === 'pending') {
            return true;
        }

        return $user->hasAnyPermission([
            'manage materials', 'materials.update', 'materials.approve-request'
        ]);
    }

    public function approve(User $user, MaterialRequisition $req): bool
    {
        return $user->hasAnyPermission([
            'approve material requests', 'manage materials', 'materials.approve-request'
        ]);
    }

    public function delete(User $user, MaterialRequisition $req): bool
    {
        if ($req->requested_by === $user->id && $req->status === 'pending') {
            return true;
        }

        return $user->hasAnyPermission([
            'delete materials', 'manage materials', 'materials.delete'
        ]);
    }
}
