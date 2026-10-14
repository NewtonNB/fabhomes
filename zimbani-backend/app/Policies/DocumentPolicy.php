<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;

class DocumentPolicy
{
    /**
     * Super Admin bypasses all checks.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasRole('Super Admin')) {
            return true;
        }

        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->hasAnyPermission(['view documents', 'manage documents', 'documents.view', 'documents.view-any']);
    }

    public function view(User $user, Document $document): bool
    {
        return $user->hasAnyPermission(['view documents', 'manage documents', 'documents.view', 'documents.view-any']);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyPermission(['create documents', 'manage documents', 'documents.create']);
    }

    public function update(User $user, Document $document): bool
    {
        // Owner can update their own documents
        if ($document->uploaded_by === $user->id) {
            return true;
        }

        return $user->hasAnyPermission(['edit documents', 'manage documents', 'documents.update']);
    }

    public function delete(User $user, Document $document): bool
    {
        if ($document->uploaded_by === $user->id) {
            return true;
        }

        return $user->hasAnyPermission(['delete documents', 'manage documents', 'documents.delete']);
    }

    public function download(User $user, Document $document): bool
    {
        return $user->hasAnyPermission(['download documents', 'view documents', 'documents.download', 'documents.view']);
    }

    public function verify(User $user, Document $document): bool
    {
        return $user->hasAnyPermission(['verify documents', 'approve documents', 'manage documents', 'documents.approve']);
    }
}
