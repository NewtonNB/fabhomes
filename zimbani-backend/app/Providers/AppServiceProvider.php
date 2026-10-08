<?php

namespace App\Providers;

use App\Models\User;
use App\Models\Company;
use App\Models\Project;
use App\Models\Site;
use App\Models\Unit;
use App\Policies\UserPolicy;
use App\Policies\RolePolicy;
use App\Policies\PermissionPolicy;
use App\Policies\CompanyPolicy;
use App\Policies\ProjectPolicy;
use App\Policies\SitePolicy;
use App\Policies\UnitPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class AppServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        User::class => UserPolicy::class,
        Role::class => RolePolicy::class,
        Permission::class => PermissionPolicy::class,
        Company::class => CompanyPolicy::class,
        Project::class => ProjectPolicy::class,
        Site::class => SitePolicy::class,
        Unit::class => UnitPolicy::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register policies
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }
    }
}
