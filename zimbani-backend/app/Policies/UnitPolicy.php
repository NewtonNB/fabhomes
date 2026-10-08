<?php

namespace App\Policies;

use App\Models\Unit;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class UnitPolicy
{
    /**
     * Perform pre-authorization checks.
     * Super Admin has access to everything.
     */
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasRole('Super Admin')) {
            return true;
        }

        return null;
    }

    /**
     * Determine whether the user can view any units.
     */
    public function viewAny(User $user): bool
    {
        // Company Admin, Site Manager, Supervisor can view units
        // Clients can view units in their projects
        return $user->hasAnyRole(['Company Admin', 'Site Manager', 'Supervisor', 'Client']);
    }

    /**
     * Determine whether the user can view the unit.
     */
    public function view(User $user, Unit $unit): bool
    {
        // Company Admin can view units in their company's projects
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $unit->project->company_id;
        }

        // Site Manager can view units in projects they're assigned to
        if ($user->hasRole('Site Manager')) {
            return $unit->project->users()->where('user_id', $user->id)->exists();
        }

        // Supervisor can view units at sites they supervise or are assigned to
        if ($user->hasRole('Supervisor')) {
            return $unit->site->supervisor_id === $user->id || 
                   $unit->site->workers()->where('user_id', $user->id)->exists();
        }

        // Client can view their own units or available units in their company
        if ($user->hasRole('Client')) {
            return $unit->client_id === $user->id || 
                   ($unit->status === 'available' && $user->company_id === $unit->project->company_id);
        }

        return false;
    }

    /**
     * Determine whether the user can create units.
     */
    public function create(User $user): bool
    {
        // Company Admin and Site Manager can create units
        return $user->hasAnyRole(['Company Admin', 'Site Manager']);
    }

    /**
     * Determine whether the user can update the unit.
     */
    public function update(User $user, Unit $unit): bool
    {
        // Company Admin can update units in their company's projects
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $unit->project->company_id;
        }

        // Site Manager can update units in assigned projects
        if ($user->hasRole('Site Manager')) {
            return $unit->project->users()->where('user_id', $user->id)->exists();
        }

        // Supervisor can update construction details of units at their sites
        if ($user->hasRole('Supervisor')) {
            return $unit->site->supervisor_id === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the unit.
     */
    public function delete(User $user, Unit $unit): bool
    {
        // Only Company Admin can delete units in their company's projects
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $unit->project->company_id;
        }

        return false;
    }

    /**
     * Determine whether the user can restore the unit.
     */
    public function restore(User $user, Unit $unit): bool
    {
        // Only Company Admin can restore units in their company's projects
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $unit->project->company_id;
        }

        return false;
    }

    /**
     * Determine whether the user can permanently delete the unit.
     */
    public function forceDelete(User $user, Unit $unit): bool
    {
        // Only Super Admin can permanently delete (handled in before())
        return false;
    }

    /**
     * Determine whether the user can reserve the unit.
     */
    public function reserve(User $user, Unit $unit): bool
    {
        // Company Admin and Site Manager can reserve units
        if ($user->hasAnyRole(['Company Admin', 'Site Manager'])) {
            if ($user->hasRole('Company Admin')) {
                return $user->company_id === $unit->project->company_id;
            }

            if ($user->hasRole('Site Manager')) {
                return $unit->project->users()->where('user_id', $user->id)->exists();
            }
        }

        // Clients can reserve available units in their company
        if ($user->hasRole('Client')) {
            return $unit->status === 'available' && 
                   $user->company_id === $unit->project->company_id;
        }

        return false;
    }

    /**
     * Determine whether the user can mark the unit as sold.
     */
    public function sell(User $user, Unit $unit): bool
    {
        // Only Company Admin and Site Manager can mark units as sold
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $unit->project->company_id;
        }

        if ($user->hasRole('Site Manager')) {
            return $unit->project->users()->where('user_id', $user->id)->exists();
        }

        return false;
    }

    /**
     * Determine whether the user can view unit pricing.
     */
    public function viewPricing(User $user, Unit $unit): bool
    {
        // Company Admin, Finance Officer, Site Manager can view pricing
        if ($user->hasAnyRole(['Company Admin', 'Finance Officer', 'Site Manager'])) {
            return $user->company_id === $unit->project->company_id;
        }

        // Clients can view pricing of available units or their own units
        if ($user->hasRole('Client')) {
            return $unit->client_id === $user->id || 
                   $unit->status === 'available';
        }

        return false;
    }

    /**
     * Determine whether the user can update unit pricing.
     */
    public function updatePricing(User $user, Unit $unit): bool
    {
        // Only Company Admin and Finance Officer can update pricing
        if ($user->hasAnyRole(['Company Admin', 'Finance Officer'])) {
            return $user->company_id === $unit->project->company_id;
        }

        return false;
    }

    /**
     * Determine whether the user can view unit payment details.
     */
    public function viewPayments(User $user, Unit $unit): bool
    {
        // Company Admin, Finance Officer can view all payment details
        if ($user->hasAnyRole(['Company Admin', 'Finance Officer'])) {
            return $user->company_id === $unit->project->company_id;
        }

        // Clients can view payment details of their own units
        if ($user->hasRole('Client')) {
            return $unit->client_id === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can update unit payment records.
     */
    public function updatePayments(User $user, Unit $unit): bool
    {
        // Only Company Admin and Finance Officer can update payment records
        if ($user->hasAnyRole(['Company Admin', 'Finance Officer'])) {
            return $user->company_id === $unit->project->company_id;
        }

        return false;
    }

    /**
     * Determine whether the user can update construction progress.
     */
    public function updateProgress(User $user, Unit $unit): bool
    {
        // Company Admin, Site Manager, Supervisor can update progress
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $unit->project->company_id;
        }

        if ($user->hasRole('Site Manager')) {
            return $unit->project->users()->where('user_id', $user->id)->exists();
        }

        if ($user->hasRole('Supervisor')) {
            return $unit->site->supervisor_id === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can conduct unit inspections.
     */
    public function conductInspection(User $user, Unit $unit): bool
    {
        // Company Admin, Site Manager, Supervisor, Quality Control can conduct inspections
        if ($user->hasAnyRole(['Company Admin', 'Site Manager', 'Supervisor', 'Quality Control'])) {
            if ($user->hasRole('Company Admin')) {
                return $user->company_id === $unit->project->company_id;
            }

            if ($user->hasRole('Site Manager')) {
                return $unit->project->users()->where('user_id', $user->id)->exists();
            }

            if ($user->hasRole('Supervisor')) {
                return $unit->site->supervisor_id === $user->id;
            }

            if ($user->hasRole('Quality Control')) {
                return $user->company_id === $unit->project->company_id;
            }
        }

        return false;
    }

    /**
     * Determine whether the user can upload unit media (images, floor plans).
     */
    public function uploadMedia(User $user, Unit $unit): bool
    {
        // Company Admin and Site Manager can upload media
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $unit->project->company_id;
        }

        if ($user->hasRole('Site Manager')) {
            return $unit->project->users()->where('user_id', $user->id)->exists();
        }

        return false;
    }

    /**
     * Determine whether the user can assign a client to the unit.
     */
    public function assignClient(User $user, Unit $unit): bool
    {
        // Only Company Admin and Site Manager can assign clients
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $unit->project->company_id;
        }

        if ($user->hasRole('Site Manager')) {
            return $unit->project->users()->where('user_id', $user->id)->exists();
        }

        return false;
    }
}
