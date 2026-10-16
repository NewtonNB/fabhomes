<?php

namespace App\Policies;

use App\Models\PaymentCertificate;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PaymentCertificatePolicy
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
        return $user->hasAnyPermission(['certificates.view-any', 'certificates.view']);
    }

    public function view(User $user, PaymentCertificate $certificate): bool
    {
        return $user->hasAnyPermission(['certificates.view-any', 'certificates.view']);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('certificates.create');
    }

    public function update(User $user, PaymentCertificate $certificate): bool
    {
        // Once approved by finance or authorized, modifications require elevated rights
        return $user->hasPermissionTo('certificates.update');
    }

    public function delete(User $user, PaymentCertificate $certificate): bool
    {
        return $user->hasPermissionTo('certificates.delete') && in_array($certificate->status, ['draft', 'rejected']);
    }

    public function verifySite(User $user, PaymentCertificate $certificate): bool
    {
        return $user->hasPermissionTo('certificates.verify-site');
    }

    public function approveFinance(User $user, PaymentCertificate $certificate): bool
    {
        return $user->hasPermissionTo('certificates.approve-finance');
    }

    public function authorizeAdmin(User $user, PaymentCertificate $certificate): bool
    {
        return $user->hasPermissionTo('certificates.authorize-admin');
    }

    public function pay(User $user, PaymentCertificate $certificate): bool
    {
        return $user->hasPermissionTo('certificates.pay');
    }

    public function export(User $user): bool
    {
        return $user->hasPermissionTo('certificates.export');
    }
}
