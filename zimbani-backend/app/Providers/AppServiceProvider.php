<?php

namespace App\Providers;

use App\Models\User;
use App\Models\Company;
use App\Models\Project;
use App\Models\Site;
use App\Models\Unit;
use App\Models\Payment;
use App\Models\Document;
use App\Models\Task;
use App\Models\ConstructionMilestone;
use App\Models\Material;
use App\Models\MaterialRequisition;
use App\Models\MaterialUsage;
use App\Policies\UserPolicy;
use App\Policies\RolePolicy;
use App\Policies\PermissionPolicy;
use App\Policies\CompanyPolicy;
use App\Policies\ProjectPolicy;
use App\Policies\SitePolicy;
use App\Policies\UnitPolicy;
use App\Policies\PaymentPolicy;
use App\Policies\DocumentPolicy;
use App\Policies\TaskPolicy;
use App\Policies\MilestonePolicy;
use App\Policies\MaterialPolicy;
use App\Policies\RequisitionPolicy;
use App\Policies\UsagePolicy;
use App\Models\Equipment;
use App\Models\EquipmentDispatch;
use App\Models\EquipmentMaintenanceLog;
use App\Models\EquipmentUtilizationLog;
use App\Models\SiteInspection;
use App\Models\PunchListItem;
use App\Models\SiteDailyLog;
use App\Models\SafetyIncident;
use App\Models\SafetyToolboxTalk;
use App\Policies\EquipmentPolicy;
use App\Policies\DispatchPolicy;
use App\Policies\MaintenancePolicy;
use App\Policies\UtilizationPolicy;
use App\Policies\SiteInspectionPolicy;
use App\Policies\PunchListItemPolicy;
use App\Policies\SiteDailyLogPolicy;
use App\Policies\SafetyIncidentPolicy;
use App\Policies\SafetyToolboxTalkPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
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
        Payment::class => PaymentPolicy::class,
        Document::class => DocumentPolicy::class,
        Task::class => TaskPolicy::class,
        ConstructionMilestone::class => MilestonePolicy::class,
        Material::class => MaterialPolicy::class,
        MaterialRequisition::class => RequisitionPolicy::class,
        MaterialUsage::class => UsagePolicy::class,
        Equipment::class => EquipmentPolicy::class,
        EquipmentDispatch::class => DispatchPolicy::class,
        EquipmentMaintenanceLog::class => MaintenancePolicy::class,
        EquipmentUtilizationLog::class => UtilizationPolicy::class,
        SiteInspection::class => SiteInspectionPolicy::class,
        PunchListItem::class => PunchListItemPolicy::class,
        SiteDailyLog::class => SiteDailyLogPolicy::class,
        SafetyIncident::class => SafetyIncidentPolicy::class,
        SafetyToolboxTalk::class => SafetyToolboxTalkPolicy::class,
        \App\Models\SavingsAccount::class => \App\Policies\SavingsAccountPolicy::class,
        \App\Models\Transaction::class => \App\Policies\TransactionPolicy::class,
        \App\Models\SubcontractorContract::class => \App\Policies\SubcontractorContractPolicy::class,
        \App\Models\PaymentCertificate::class => \App\Policies\PaymentCertificatePolicy::class,
        \App\Models\PettyCashAccount::class => \App\Policies\PettyCashAccountPolicy::class,
        \App\Models\ExpenseClaim::class => \App\Policies\ExpenseClaimPolicy::class,
        \App\Models\RetentionFund::class => \App\Policies\RetentionFundPolicy::class,
        \App\Models\DefectLiabilityCertificate::class => \App\Policies\DefectLiabilityCertificatePolicy::class,
        \App\Models\ConstructionSavingScheme::class => \App\Policies\ConstructionSavingSchemePolicy::class,
        \App\Models\MobileMoneyTransaction::class => \App\Policies\MobileMoneyTransactionPolicy::class,
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
        // Implicitly grant 'Super Admin' role all permissions across all Gates & Policies
        Gate::before(function ($user, $ability) {
            return $user->hasRole('Super Admin') ? true : null;
        });

        // Register policies
        foreach ($this->policies as $model => $policy) {
            Gate::policy($model, $policy);
        }

        // Enterprise Rate Limiters & API Shielding (Phase 14 Day 1)
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('auth', function (Request $request) {
            $email = (string) $request->input('email');
            return Limit::perMinute(5)->by($email . '|' . $request->ip())->response(function (Request $request, array $headers) {
                \App\Models\SecurityAuditLog::record(
                    'rate_limit_exceeded',
                    ['limiter' => 'auth', 'ip' => $request->ip(), 'email' => $request->input('email')],
                    null,
                    'warning',
                    $request
                );
                return response()->json([
                    'status' => 'error',
                    'message' => 'Too many authentication attempts. Rate limit exceeded. Please wait before retrying.',
                ], 429, $headers);
            });
        });

        RateLimiter::for('payments', function (Request $request) {
            return Limit::perMinute(15)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('pin_verification', function (Request $request) {
            return Limit::perMinutes(15, 5)->by($request->user()?->id ?: $request->ip());
        });
    }
}
