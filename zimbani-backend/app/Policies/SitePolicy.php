<?php

namespace App\Policies;

use App\Models\Site;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class SitePolicy
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
     * Determine whether the user can view any sites.
     */
    public function viewAny(User $user): bool
    {
        // Company Admin, Site Manager, and Supervisor can view sites
        return $user->hasAnyRole(['Company Admin', 'Site Manager', 'Supervisor']);
    }

    /**
     * Determine whether the user can view the site.
     */
    public function view(User $user, Site $site): bool
    {
        // Company Admin can view sites in projects belonging to their company
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $site->project->company_id;
        }

        // Site Manager can view sites in projects they're assigned to
        if ($user->hasRole('Site Manager')) {
            return $site->project->users()->where('user_id', $user->id)->exists();
        }

        // Supervisor can view sites they supervise or are assigned to as workers
        if ($user->hasRole('Supervisor')) {
            return $site->supervisor_id === $user->id || 
                   $site->workers()->where('user_id', $user->id)->exists();
        }

        return false;
    }

    /**
     * Determine whether the user can create sites.
     */
    public function create(User $user): bool
    {
        // Company Admin and Site Manager can create sites
        return $user->hasAnyRole(['Company Admin', 'Site Manager']);
    }

    /**
     * Determine whether the user can update the site.
     */
    public function update(User $user, Site $site): bool
    {
        // Company Admin can update sites in projects belonging to their company
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $site->project->company_id;
        }

        // Site Manager can update sites in assigned projects
        if ($user->hasRole('Site Manager')) {
            return $site->project->users()->where('user_id', $user->id)->exists();
        }

        // Supervisor can update sites they supervise (limited fields)
        if ($user->hasRole('Supervisor')) {
            return $site->supervisor_id === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the site.
     */
    public function delete(User $user, Site $site): bool
    {
        // Only Company Admin can delete sites
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $site->project->company_id;
        }

        return false;
    }

    /**
     * Determine whether the user can restore the site.
     */
    public function restore(User $user, Site $site): bool
    {
        // Only Company Admin can restore sites
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $site->project->company_id;
        }

        return false;
    }

    /**
     * Determine whether the user can permanently delete the site.
     */
    public function forceDelete(User $user, Site $site): bool
    {
        // Only Super Admin can permanently delete (handled in before())
        return false;
    }

    /**
     * Determine whether the user can assign workers to the site.
     */
    public function assignWorkers(User $user, Site $site): bool
    {
        // Company Admin and Site Manager can assign workers
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $site->project->company_id;
        }

        if ($user->hasRole('Site Manager')) {
            return $site->project->users()->where('user_id', $user->id)->exists();
        }

        return false;
    }

    /**
     * Determine whether the user can manage site equipment.
     */
    public function manageEquipment(User $user, Site $site): bool
    {
        // Company Admin, Site Manager, and Supervisor can manage equipment
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $site->project->company_id;
        }

        if ($user->hasRole('Site Manager')) {
            return $site->project->users()->where('user_id', $user->id)->exists();
        }

        if ($user->hasRole('Supervisor')) {
            return $site->supervisor_id === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can view site financial data.
     */
    public function viewFinancials(User $user, Site $site): bool
    {
        // Company Admin and Finance Officer can view financials
        if ($user->hasAnyRole(['Company Admin', 'Finance Officer'])) {
            return $user->company_id === $site->project->company_id;
        }

        return false;
    }

    /**
     * Determine whether the user can update site financial data.
     */
    public function updateFinancials(User $user, Site $site): bool
    {
        // Only Company Admin and Finance Officer can update financials
        if ($user->hasAnyRole(['Company Admin', 'Finance Officer'])) {
            return $user->company_id === $site->project->company_id;
        }

        return false;
    }

    /**
     * Determine whether the user can manage site safety measures.
     */
    public function manageSafety(User $user, Site $site): bool
    {
        // Company Admin, Site Manager, and Supervisor can manage safety
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $site->project->company_id;
        }

        if ($user->hasRole('Site Manager')) {
            return $site->project->users()->where('user_id', $user->id)->exists();
        }

        if ($user->hasRole('Supervisor')) {
            return $site->supervisor_id === $user->id;
        }

        return false;
    }

    /**
     * Determine whether the user can conduct site inspections.
     */
    public function conductInspections(User $user, Site $site): bool
    {
        // Company Admin, Site Manager, Supervisor, and Quality Control can conduct inspections
        if ($user->hasAnyRole(['Company Admin', 'Site Manager', 'Supervisor', 'Quality Control'])) {
            // Company Admin: company-scoped
            if ($user->hasRole('Company Admin')) {
                return $user->company_id === $site->project->company_id;
            }

            // Site Manager: project-assigned
            if ($user->hasRole('Site Manager')) {
                return $site->project->users()->where('user_id', $user->id)->exists();
            }

            // Supervisor: site-assigned
            if ($user->hasRole('Supervisor')) {
                return $site->supervisor_id === $user->id || 
                       $site->workers()->where('user_id', $user->id)->exists();
            }

            // Quality Control: can inspect sites in their company
            if ($user->hasRole('Quality Control')) {
                return $user->company_id === $site->project->company_id;
            }
        }

        return false;
    }
}
