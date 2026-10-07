<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Define permissions organized by module
        $permissionsByModule = [
            // User Management Module
            'users' => [
                'users.view',
                'users.view-any',
                'users.create',
                'users.update',
                'users.delete',
                'users.restore',
                'users.force-delete',
                'users.assign-roles',
                'users.assign-permissions',
            ],

            // Role & Permission Management Module
            'roles' => [
                'roles.view',
                'roles.view-any',
                'roles.create',
                'roles.update',
                'roles.delete',
                'roles.assign-permissions',
            ],
            'permissions' => [
                'permissions.view',
                'permissions.view-any',
                'permissions.create',
                'permissions.update',
                'permissions.delete',
            ],

            // Company Management Module
            'companies' => [
                'companies.view',
                'companies.view-any',
                'companies.create',
                'companies.update',
                'companies.delete',
                'companies.manage-settings',
                'companies.view-financials',
            ],

            // Project Management Module
            'projects' => [
                'projects.view',
                'projects.view-any',
                'projects.create',
                'projects.update',
                'projects.delete',
                'projects.archive',
                'projects.restore',
                'projects.manage-budget',
                'projects.view-financials',
                'projects.assign-team',
            ],

            // Land/Plot Management Module
            'plots' => [
                'plots.view',
                'plots.view-any',
                'plots.create',
                'plots.update',
                'plots.delete',
                'plots.assign-owner',
                'plots.transfer-ownership',
                'plots.view-history',
            ],

            // Construction Site Module
            'sites' => [
                'sites.view',
                'sites.view-any',
                'sites.create',
                'sites.update',
                'sites.delete',
                'sites.manage-workers',
                'sites.view-progress',
                'sites.update-progress',
            ],

            // Task Management Module
            'tasks' => [
                'tasks.view',
                'tasks.view-any',
                'tasks.create',
                'tasks.update',
                'tasks.delete',
                'tasks.assign',
                'tasks.complete',
                'tasks.view-assigned',
            ],

            // Worker Management Module
            'workers' => [
                'workers.view',
                'workers.view-any',
                'workers.create',
                'workers.update',
                'workers.delete',
                'workers.assign-to-site',
                'workers.clock-in',
                'workers.clock-out',
                'workers.view-attendance',
            ],

            // Attendance Module
            'attendance' => [
                'attendance.view',
                'attendance.view-any',
                'attendance.create',
                'attendance.update',
                'attendance.delete',
                'attendance.approve',
                'attendance.export',
            ],

            // Material Management Module
            'materials' => [
                'materials.view',
                'materials.view-any',
                'materials.create',
                'materials.update',
                'materials.delete',
                'materials.request',
                'materials.approve-request',
                'materials.track-usage',
                'materials.view-inventory',
            ],

            // Financial Module - Payments
            'payments' => [
                'payments.view',
                'payments.view-any',
                'payments.create',
                'payments.update',
                'payments.delete',
                'payments.approve',
                'payments.process',
                'payments.refund',
                'payments.export',
            ],

            // Financial Module - Invoices
            'invoices' => [
                'invoices.view',
                'invoices.view-any',
                'invoices.create',
                'invoices.update',
                'invoices.delete',
                'invoices.send',
                'invoices.approve',
                'invoices.mark-paid',
                'invoices.export',
            ],

            // Financial Module - Expenses
            'expenses' => [
                'expenses.view',
                'expenses.view-any',
                'expenses.create',
                'expenses.update',
                'expenses.delete',
                'expenses.approve',
                'expenses.reimburse',
                'expenses.export',
            ],

            // Financial Module - Budgets
            'budgets' => [
                'budgets.view',
                'budgets.view-any',
                'budgets.create',
                'budgets.update',
                'budgets.delete',
                'budgets.approve',
                'budgets.allocate',
            ],

            // Contract Management Module
            'contracts' => [
                'contracts.view',
                'contracts.view-any',
                'contracts.create',
                'contracts.update',
                'contracts.delete',
                'contracts.sign',
                'contracts.approve',
                'contracts.terminate',
            ],

            // Document Management Module
            'documents' => [
                'documents.view',
                'documents.view-any',
                'documents.create',
                'documents.update',
                'documents.delete',
                'documents.download',
                'documents.share',
                'documents.approve',
            ],

            // Report Module
            'reports' => [
                'reports.view-financial',
                'reports.view-progress',
                'reports.view-attendance',
                'reports.view-inventory',
                'reports.view-analytics',
                'reports.export',
                'reports.schedule',
            ],

            // Notification Module
            'notifications' => [
                'notifications.view',
                'notifications.create',
                'notifications.send',
                'notifications.manage-preferences',
            ],

            // Audit Log Module
            'audit-logs' => [
                'audit-logs.view',
                'audit-logs.view-any',
                'audit-logs.export',
            ],

            // System Settings Module
            'settings' => [
                'settings.view',
                'settings.update',
                'settings.manage-system',
                'settings.manage-integrations',
            ],
        ];

        // Create all permissions
        $totalPermissions = 0;
        foreach ($permissionsByModule as $module => $permissions) {
            $this->command->info("Creating permissions for module: {$module}");
            
            foreach ($permissions as $permission) {
                Permission::create([
                    'name' => $permission,
                    'guard_name' => 'web',
                ]);
                $totalPermissions++;
            }
        }

        $this->command->info("Created {$totalPermissions} permissions across " . count($permissionsByModule) . " modules.");

        // Assign all permissions to Super Admin role
        $superAdmin = Role::findByName('Super Admin', 'web');
        $superAdmin->givePermissionTo(Permission::all());
        $this->command->info('Assigned all permissions to Super Admin role.');

        // Assign specific permissions to other roles
        $this->assignRolePermissions();

        $this->command->info('All permissions created and assigned successfully!');
    }

    /**
     * Assign permissions to specific roles based on their responsibilities.
     */
    private function assignRolePermissions(): void
    {
        // Company Admin - Full company and project management
        $companyAdmin = Role::findByName('Company Admin', 'web');
        $companyAdmin->givePermissionTo([
            // Users (except system-level operations)
            'users.view', 'users.view-any', 'users.create', 'users.update', 'users.assign-roles',
            
            // Companies
            'companies.view', 'companies.update', 'companies.manage-settings', 'companies.view-financials',
            
            // Projects - Full access
            'projects.view', 'projects.view-any', 'projects.create', 'projects.update', 'projects.delete',
            'projects.archive', 'projects.restore', 'projects.manage-budget', 'projects.view-financials', 'projects.assign-team',
            
            // Plots - Full access
            'plots.view', 'plots.view-any', 'plots.create', 'plots.update', 'plots.assign-owner',
            'plots.transfer-ownership', 'plots.view-history',
            
            // Sites - Full access
            'sites.view', 'sites.view-any', 'sites.create', 'sites.update', 'sites.manage-workers',
            'sites.view-progress', 'sites.update-progress',
            
            // Financial - Full access
            'payments.view', 'payments.view-any', 'payments.create', 'payments.approve', 'payments.process',
            'invoices.view', 'invoices.view-any', 'invoices.create', 'invoices.approve', 'invoices.send',
            'expenses.view', 'expenses.view-any', 'expenses.approve', 'expenses.reimburse',
            'budgets.view', 'budgets.view-any', 'budgets.create', 'budgets.update', 'budgets.approve', 'budgets.allocate',
            
            // Reports - Full access
            'reports.view-financial', 'reports.view-progress', 'reports.view-attendance', 'reports.view-inventory',
            'reports.view-analytics', 'reports.export',
            
            // Documents
            'documents.view', 'documents.view-any', 'documents.create', 'documents.update', 'documents.approve',
            
            // Contracts
            'contracts.view', 'contracts.view-any', 'contracts.create', 'contracts.update', 'contracts.approve',
        ]);

        // Site Manager - Site operations and worker management
        $siteManager = Role::findByName('Site Manager', 'web');
        $siteManager->givePermissionTo([
            'sites.view', 'sites.view-any', 'sites.update', 'sites.manage-workers', 'sites.view-progress', 'sites.update-progress',
            'tasks.view', 'tasks.view-any', 'tasks.create', 'tasks.update', 'tasks.assign', 'tasks.complete',
            'workers.view', 'workers.view-any', 'workers.create', 'workers.update', 'workers.assign-to-site', 'workers.view-attendance',
            'attendance.view', 'attendance.view-any', 'attendance.create', 'attendance.update', 'attendance.approve',
            'materials.view', 'materials.view-any', 'materials.request', 'materials.track-usage', 'materials.view-inventory',
            'expenses.view', 'expenses.create',
            'documents.view', 'documents.view-any', 'documents.create',
            'reports.view-progress', 'reports.view-attendance', 'reports.view-inventory',
            'notifications.view', 'notifications.create',
        ]);

        // Supervisor - Worker supervision and task management
        $supervisor = Role::findByName('Supervisor', 'web');
        $supervisor->givePermissionTo([
            'sites.view', 'sites.view-progress', 'sites.update-progress',
            'tasks.view', 'tasks.view-any', 'tasks.create', 'tasks.update', 'tasks.assign', 'tasks.complete',
            'workers.view', 'workers.view-any', 'workers.clock-in', 'workers.clock-out', 'workers.view-attendance',
            'attendance.view', 'attendance.view-any', 'attendance.create', 'attendance.update',
            'materials.view', 'materials.request', 'materials.track-usage',
            'documents.view', 'documents.create',
            'reports.view-progress', 'reports.view-attendance',
            'notifications.view',
        ]);

        // Worker - Basic task execution and attendance
        $worker = Role::findByName('Worker', 'web');
        $worker->givePermissionTo([
            'tasks.view', 'tasks.view-assigned', 'tasks.update', 'tasks.complete',
            'workers.clock-in', 'workers.clock-out',
            'attendance.view',
            'materials.view',
            'documents.view',
            'notifications.view',
        ]);

        // Finance Officer - Financial operations
        $financeOfficer = Role::findByName('Finance Officer', 'web');
        $financeOfficer->givePermissionTo([
            'payments.view', 'payments.view-any', 'payments.create', 'payments.update', 'payments.approve',
            'payments.process', 'payments.refund', 'payments.export',
            'invoices.view', 'invoices.view-any', 'invoices.create', 'invoices.update', 'invoices.send',
            'invoices.approve', 'invoices.mark-paid', 'invoices.export',
            'expenses.view', 'expenses.view-any', 'expenses.create', 'expenses.update', 'expenses.approve',
            'expenses.reimburse', 'expenses.export',
            'budgets.view', 'budgets.view-any', 'budgets.create', 'budgets.update', 'budgets.allocate',
            'projects.view', 'projects.view-any', 'projects.view-financials',
            'companies.view-financials',
            'reports.view-financial', 'reports.export',
            'documents.view', 'documents.view-any', 'documents.create',
            'audit-logs.view', 'audit-logs.view-any',
        ]);

        // Client - Read-only access to their projects
        $client = Role::findByName('Client', 'web');
        $client->givePermissionTo([
            'projects.view',
            'plots.view',
            'sites.view', 'sites.view-progress',
            'tasks.view',
            'payments.view',
            'invoices.view',
            'contracts.view',
            'documents.view', 'documents.download',
            'reports.view-progress', 'reports.view-financial',
            'notifications.view',
        ]);

        $this->command->info('Role-specific permissions assigned successfully!');
    }
}
