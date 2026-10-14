<?php

namespace App\Policies;

use App\Models\Payment;
use App\Models\User;

class PaymentPolicy
{
    /**
     * Perform pre-authorization checks.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasRole('Super Admin')) {
            return true;
        }

        return null;
    }

    /**
     * Determine whether the user can view any payments.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyPermission(['view payments', 'manage payments', 'payments.view', 'payments.view-any']);
    }

    /**
     * Determine whether the user can view the payment.
     */
    public function view(User $user, Payment $payment): bool
    {
        return $user->hasAnyPermission(['view payments', 'manage payments', 'payments.view', 'payments.view-any']);
    }

    /**
     * Determine whether the user can create payments.
     */
    public function create(User $user): bool
    {
        return $user->hasAnyPermission(['create payments', 'manage payments', 'payments.create']);
    }

    /**
     * Determine whether the user can update the payment.
     */
    public function update(User $user, Payment $payment): bool
    {
        // Finance officers can update pending/rejected payments
        if ($user->hasRole('Finance Officer')) {
            return in_array($payment->status, ['pending', 'rejected']);
        }

        return $user->hasAnyPermission(['edit payments', 'manage payments', 'payments.update']);
    }

    /**
     * Determine whether the user can delete the payment.
     */
    public function delete(User $user, Payment $payment): bool
    {
        // Only pending/rejected payments can be deleted
        if (!in_array($payment->status, ['pending', 'rejected', 'cancelled'])) {
            return false;
        }

        return $user->hasAnyPermission(['delete payments', 'manage payments', 'payments.delete']);
    }

    /**
     * Determine whether the user can restore the payment.
     */
    public function restore(User $user, Payment $payment): bool
    {
        return $user->hasAnyPermission(['manage payments', 'payments.restore']);
    }

    /**
     * Determine whether the user can permanently delete the payment.
     */
    public function forceDelete(User $user, Payment $payment): bool
    {
        return $user->hasRole('Super Admin');
    }

    /**
     * Determine whether the user can confirm payments.
     */
    public function confirm(User $user, Payment $payment): bool
    {
        return $user->hasAnyPermission(['confirm payments', 'manage payments', 'payments.approve']);
    }

    /**
     * Determine whether the user can verify payments.
     */
    public function verify(User $user, Payment $payment): bool
    {
        return $user->hasAnyPermission(['verify payments', 'manage payments', 'payments.process']);
    }

    /**
     * Determine whether the user can reject payments.
     */
    public function reject(User $user, Payment $payment): bool
    {
        return $user->hasAnyPermission(['confirm payments', 'manage payments', 'payments.approve']);
    }

    /**
     * Determine whether the user can refund payments.
     */
    public function refund(User $user, Payment $payment): bool
    {
        return $user->hasAnyPermission(['refund payments', 'manage payments', 'payments.refund']);
    }

    /**
     * Determine whether the user can cancel payments.
     */
    public function cancel(User $user, Payment $payment): bool
    {
        return $user->hasAnyPermission(['cancel payments', 'manage payments', 'payments.delete']);
    }
}
