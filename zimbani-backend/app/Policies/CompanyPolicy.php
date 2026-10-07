<?php

namespace App\Policies;

use App\Models\Company;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CompanyPolicy
{
    use HandlesAuthorization;

    /**
     * Perform pre-authorization checks.
     * Super Admin bypasses all checks
     */
    public function before(User $user, string $ability): bool|null
    {
        if ($user->hasRole('Super Admin')) {
            return true;
        }

        return null;
    }

    /**
     * Determine whether the user can view any companies.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('companies.view');
    }

    /**
     * Determine whether the user can view the company.
     */
    public function view(User $user, Company $company): bool
    {
        // User must have view permission
        if (!$user->hasPermissionTo('companies.view')) {
            return false;
        }

        // Company Admin can only view their own company
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $company->id;
        }

        // Other roles with permission can view all
        return true;
    }

    /**
     * Determine whether the user can create companies.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('companies.create');
    }

    /**
     * Determine whether the user can update the company.
     */
    public function update(User $user, Company $company): bool
    {
        // User must have update permission
        if (!$user->hasPermissionTo('companies.update')) {
            return false;
        }

        // Company Admin can only update their own company
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $company->id;
        }

        // Other roles with permission can update all
        return true;
    }

    /**
     * Determine whether the user can delete the company.
     */
    public function delete(User $user, Company $company): bool
    {
        // User must have delete permission
        if (!$user->hasPermissionTo('companies.delete')) {
            return false;
        }

        // Prevent deletion of company with active subsidiaries
        if ($company->hasSubsidiaries()) {
            return false;
        }

        // Prevent deletion of company with active users
        if ($company->users()->exists()) {
            return false;
        }

        // Company Admin cannot delete companies
        if ($user->hasRole('Company Admin')) {
            return false;
        }

        return true;
    }

    /**
     * Determine whether the user can restore the company.
     */
    public function restore(User $user, Company $company): bool
    {
        return $user->hasPermissionTo('companies.create');
    }

    /**
     * Determine whether the user can permanently delete the company.
     */
    public function forceDelete(User $user, Company $company): bool
    {
        // Only Super Admin can force delete (handled by before method)
        return false;
    }

    /**
     * Determine whether the user can manage company subsidiaries.
     */
    public function manageSubsidiaries(User $user, Company $company): bool
    {
        // User must have update permission
        if (!$user->hasPermissionTo('companies.update')) {
            return false;
        }

        // Company Admin can manage subsidiaries of their own company
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $company->id;
        }

        return true;
    }

    /**
     * Determine whether the user can assign users to the company.
     */
    public function assignUsers(User $user, Company $company): bool
    {
        // User must have user management permission
        if (!$user->hasPermissionTo('users.update')) {
            return false;
        }

        // Company Admin can assign users to their own company
        if ($user->hasRole('Company Admin')) {
            return $user->company_id === $company->id;
        }

        return true;
    }
}
