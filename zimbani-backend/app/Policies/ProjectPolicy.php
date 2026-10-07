<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ProjectPolicy
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
     * Determine whether the user can view any projects.
     */
    public function viewAny(User $user): bool
    {
        // Company Admin can view all projects in their company
        // Site Manager can view assigned projects
        return $user->hasAnyRole(['Company Admin', 'Site Manager', 'Supervisor']);
    }

    /**
     * Determine whether the user can view the project.
     */
    public function view(User $user, Project $project): bool
    {
        // Company Admin can view projects in their company
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $project->company_id;
        }

        // Site Manager and Supervisor can view projects they're assigned to
        if ($user->hasAnyRole(['Site Manager', 'Supervisor'])) {
            return $project->users()->where('user_id', $user->id)->exists();
        }

        return false;
    }

    /**
     * Determine whether the user can create projects.
     */
    public function create(User $user): bool
    {
        // Only Company Admin can create projects
        return $user->hasRole('Company Admin');
    }

    /**
     * Determine whether the user can update the project.
     */
    public function update(User $user, Project $project): bool
    {
        // Company Admin can update projects in their company
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $project->company_id;
        }

        // Site Manager can update assigned projects (limited fields)
        if ($user->hasRole('Site Manager')) {
            return $project->users()->where('user_id', $user->id)->exists();
        }

        return false;
    }

    /**
     * Determine whether the user can delete the project.
     */
    public function delete(User $user, Project $project): bool
    {
        // Only Company Admin can delete projects in their company
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $project->company_id;
        }

        return false;
    }

    /**
     * Determine whether the user can restore the project.
     */
    public function restore(User $user, Project $project): bool
    {
        // Only Company Admin can restore projects in their company
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $project->company_id;
        }

        return false;
    }

    /**
     * Determine whether the user can permanently delete the project.
     */
    public function forceDelete(User $user, Project $project): bool
    {
        // Only Super Admin can permanently delete (handled in before())
        return false;
    }

    /**
     * Determine whether the user can assign users to the project.
     */
    public function assignUsers(User $user, Project $project): bool
    {
        // Company Admin can assign users to projects in their company
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $project->company_id;
        }

        return false;
    }

    /**
     * Determine whether the user can manage project sites.
     */
    public function manageSites(User $user, Project $project): bool
    {
        // Company Admin can manage sites
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $project->company_id;
        }

        // Site Manager can manage sites for assigned projects
        if ($user->hasRole('Site Manager')) {
            return $project->users()->where('user_id', $user->id)->exists();
        }

        return false;
    }

    /**
     * Determine whether the user can view project financial data.
     */
    public function viewFinancials(User $user, Project $project): bool
    {
        // Company Admin and Finance Officer can view financials
        if ($user->hasAnyRole(['Company Admin', 'Finance Officer'])) {
            return $user->company_id === $project->company_id;
        }

        return false;
    }

    /**
     * Determine whether the user can update project financial data.
     */
    public function updateFinancials(User $user, Project $project): bool
    {
        // Only Company Admin and Finance Officer can update financials
        if ($user->hasAnyRole(['Company Admin', 'Finance Officer'])) {
            return $user->company_id === $project->company_id;
        }

        return false;
    }
}
