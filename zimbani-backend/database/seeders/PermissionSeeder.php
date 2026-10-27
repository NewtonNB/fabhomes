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

            // Estates / Sites Module
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

            // Units Module
            'units' => [
                'units.view',
                'units.view-any',
                'units.create',
                'units.update',
                'units.delete',
            ],

            // Client Management Module (KYC)
            'clients' => [
                'clients.view',
                'clients.view-any',
                'clients.create',
                'clients.update',
                'clients.delete',
                'clients.export',
            ],

            // Mother Titles & Legal Deeds Module
            'mother-titles' => [
                'mother-titles.view',
                'mother-titles.view-any',
                'mother-titles.create',
                'mother-titles.update',
                'mother-titles.delete',
                'mother-titles.export',
            ],

            // CashBook Module
            'cashbook' => [
                'cashbook.view',
                'cashbook.view-any',
                'cashbook.create',
                'cashbook.manage',
                'cashbook.export',
            ],

            // Client Refunds Module
            'refunds' => [
                'refunds.view',
                'refunds.view-any',
                'refunds.create',
                'refunds.update',
                'refunds.approve',
                'refunds.process',
                'refunds.export',
            ],

            // Employees & HR Module
            'employees' => [
                'employees.view',
                'employees.view-any',
                'employees.create',
                'employees.update',
                'employees.delete',
                'employees.export',
            ],

            // Bank & Mobile Money Reconciliation Module
            'reconciliation' => [
                'reconciliation.view',
                'reconciliation.view-any',
                'reconciliation.match',
                'reconciliation.approve',
                'reconciliation.export',
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

            // Equipment & Machinery Module
            'equipment' => [
                'equipment.view',
                'equipment.view-any',
                'equipment.create',
                'equipment.update',
                'equipment.delete',
                'equipment.dispatch',
                'equipment.maintain',
                'equipment.log-utilization',
                'equipment.assign-operator',
            ],

            // Site Quality Control & Inspections Module
            'inspections' => [
                'inspections.view',
                'inspections.view-any',
                'inspections.create',
                'inspections.update',
                'inspections.delete',
                'inspections.sign-off',
            ],

            // Defects & Punch List Module
            'defects' => [
                'defects.view',
                'defects.view-any',
                'defects.create',
                'defects.update',
                'defects.delete',
                'defects.verify',
            ],

            // Site Daily Logs & Supervisor Reporting Module
            'daily-logs' => [
                'daily-logs.view',
                'daily-logs.view-any',
                'daily-logs.create',
                'daily-logs.update',
                'daily-logs.delete',
                'daily-logs.approve',
            ],

            // Site Safety, Incidents & Toolbox Talks Module
            'safety' => [
                'safety.view',
                'safety.view-any',
                'safety.create',
                'safety.update',
                'safety.delete',
                'safety.investigate',
                'safety.close',
            ],

            // Financial Module - Savings Accounts
            'accounts' => [
                'accounts.view',
                'accounts.view-any',
                'accounts.create',
                'accounts.update',
                'accounts.delete',
                'accounts.activate',
                'accounts.suspend',
                'accounts.close',
                'accounts.adjust-balance',
                'accounts.statement',
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
                'payments.verify',
            ],

            // Financial Module - Transactions & Immutable Ledger
            'transactions' => [
                'transactions.view',
                'transactions.view-any',
                'transactions.create',
                'transactions.reverse',
                'transactions.reconcile',
                'transactions.export',
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

            // Financial Module - Expenses & Direct Site Purchases
            'expenses' => [
                'expenses.view',
                'expenses.view-any',
                'expenses.create',
                'expenses.update',
                'expenses.delete',
                'expenses.verify-site',
                'expenses.approve-finance',
                'expenses.authorize-admin',
                'expenses.reimburse',
                'expenses.pay',
                'expenses.export',
            ],

            // Financial Module - Petty Cash Accounts & Site Floats
            'petty-cash' => [
                'petty-cash.view',
                'petty-cash.view-any',
                'petty-cash.create',
                'petty-cash.update',
                'petty-cash.delete',
                'petty-cash.top-up',
                'petty-cash.reconcile',
                'petty-cash.export',
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

            // Subcontractor Payment Certificates & Valuations Module
            'certificates' => [
                'certificates.view',
                'certificates.view-any',
                'certificates.create',
                'certificates.update',
                'certificates.delete',
                'certificates.verify-site',
                'certificates.approve-finance',
                'certificates.authorize-admin',
                'certificates.pay',
                'certificates.export',
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
            foreach ($permissions as $permission) {
                Permission::firstOrCreate([
                    'name' => $permission,
                    'guard_name' => 'web',
                ]);
                $totalPermissions++;
            }
        }

        $this->command->info("Created/verified {$totalPermissions} permissions across " . count($permissionsByModule) . " modules.");

        // Assign all permissions to Super Admin role
        $superAdmin = Role::findByName('Super Admin', 'web');
        $superAdmin->givePermissionTo(Permission::all());
        $this->command->info('Assigned all permissions to Super Admin role.');

        // Assign specific permissions to all roles
        $this->assignRolePermissions();

        $this->command->info('All permissions created and assigned successfully!');
    }

    /**
     * Assign permissions to specific roles based on official system responsibilities.
     */
    private function assignRolePermissions(): void
    {
        // 1. Finance Manager
        $financeManager = Role::findByName('Finance Manager', 'web');
        $financeManager->syncPermissions([
            // Accounts
            'accounts.view', 'accounts.view-any', 'accounts.create', 'accounts.update', 'accounts.delete',
            'accounts.activate', 'accounts.suspend', 'accounts.close', 'accounts.adjust-balance', 'accounts.statement',
            // Transactions & CashBook
            'transactions.view', 'transactions.view-any', 'transactions.create', 'transactions.reverse',
            'transactions.reconcile', 'transactions.export',
            'cashbook.view', 'cashbook.view-any', 'cashbook.create', 'cashbook.manage', 'cashbook.export',
            // Payments & Refunds
            'payments.view', 'payments.view-any', 'payments.create', 'payments.update', 'payments.approve',
            'payments.process', 'payments.refund', 'payments.export', 'payments.verify',
            'refunds.view', 'refunds.view-any', 'refunds.create', 'refunds.update', 'refunds.approve', 'refunds.process', 'refunds.export',
            // Reconciliation
            'reconciliation.view', 'reconciliation.view-any', 'reconciliation.match', 'reconciliation.approve', 'reconciliation.export',
            // Invoices, Expenses, Petty Cash & Budgets
            'invoices.view', 'invoices.view-any', 'invoices.create', 'invoices.update', 'invoices.send',
            'invoices.approve', 'invoices.mark-paid', 'invoices.export',
            'expenses.view', 'expenses.view-any', 'expenses.create', 'expenses.update', 'expenses.delete',
            'expenses.verify-site', 'expenses.approve-finance', 'expenses.authorize-admin', 'expenses.reimburse', 'expenses.pay', 'expenses.export',
            'petty-cash.view', 'petty-cash.view-any', 'petty-cash.create', 'petty-cash.update', 'petty-cash.delete', 'petty-cash.top-up', 'petty-cash.reconcile', 'petty-cash.export',
            'budgets.view', 'budgets.view-any', 'budgets.create', 'budgets.update', 'budgets.approve', 'budgets.allocate',
            // Contracts & Certificates
            'contracts.view', 'contracts.view-any', 'contracts.create', 'contracts.update', 'contracts.approve',
            'certificates.view', 'certificates.view-any', 'certificates.create', 'certificates.update', 'certificates.approve-finance', 'certificates.pay', 'certificates.export',
            // Clients & Overview
            'clients.view', 'clients.view-any', 'clients.export',
            'projects.view', 'projects.view-any', 'projects.view-financials',
            'sites.view', 'sites.view-any',
            'reports.view-financial', 'reports.export',
            'documents.view', 'documents.view-any', 'documents.download', 'documents.create',
            'notifications.view', 'notifications.create',
            'audit-logs.view',
        ]);

        // 2. Reconciliation Manager
        $reconManager = Role::findByName('Reconciliation Manager', 'web');
        $reconManager->syncPermissions([
            'reconciliation.view', 'reconciliation.view-any', 'reconciliation.match', 'reconciliation.approve', 'reconciliation.export',
            'payments.view', 'payments.view-any', 'payments.verify', 'payments.export',
            'transactions.view', 'transactions.view-any', 'transactions.reconcile', 'transactions.export',
            'accounts.view', 'accounts.view-any', 'accounts.statement',
            'cashbook.view', 'cashbook.view-any', 'cashbook.export',
            'reports.view-financial', 'reports.export',
            'documents.view', 'documents.download',
            'notifications.view',
        ]);

        // 3. Surveyor Manager
        $surveyorManager = Role::findByName('Surveyor Manager', 'web');
        $surveyorManager->syncPermissions([
            'mother-titles.view', 'mother-titles.view-any', 'mother-titles.create', 'mother-titles.update', 'mother-titles.delete', 'mother-titles.export',
            'plots.view', 'plots.view-any', 'plots.create', 'plots.update', 'plots.delete', 'plots.assign-owner', 'plots.transfer-ownership', 'plots.view-history',
            'sites.view', 'sites.view-any', 'sites.create', 'sites.update', 'sites.view-progress', 'sites.update-progress',
            'units.view', 'units.view-any', 'units.create', 'units.update',
            'projects.view', 'projects.view-any',
            'inspections.view', 'inspections.view-any', 'inspections.create', 'inspections.update', 'inspections.sign-off',
            'documents.view', 'documents.view-any', 'documents.create', 'documents.update', 'documents.download', 'documents.share',
            'reports.view-progress', 'reports.export',
            'notifications.view', 'notifications.create',
        ]);

        // 4. Construction / Project Manager
        $constructionManager = Role::findByName('Construction / Project Manager', 'web');
        $constructionManager->syncPermissions([
            'projects.view', 'projects.view-any', 'projects.create', 'projects.update', 'projects.archive', 'projects.restore', 'projects.manage-budget', 'projects.assign-team',
            'sites.view', 'sites.view-any', 'sites.create', 'sites.update', 'sites.manage-workers', 'sites.view-progress', 'sites.update-progress',
            'units.view', 'units.view-any', 'units.create', 'units.update',
            'tasks.view', 'tasks.view-any', 'tasks.create', 'tasks.update', 'tasks.delete', 'tasks.assign', 'tasks.complete',
            'workers.view', 'workers.view-any', 'workers.create', 'workers.update', 'workers.assign-to-site', 'workers.view-attendance',
            'attendance.view', 'attendance.view-any', 'attendance.create', 'attendance.update', 'attendance.approve',
            'materials.view', 'materials.view-any', 'materials.create', 'materials.update', 'materials.request', 'materials.approve-request', 'materials.track-usage', 'materials.view-inventory',
            'equipment.view', 'equipment.view-any', 'equipment.create', 'equipment.update', 'equipment.dispatch', 'equipment.maintain', 'equipment.log-utilization', 'equipment.assign-operator',
            'inspections.view', 'inspections.view-any', 'inspections.create', 'inspections.update', 'inspections.delete', 'inspections.sign-off',
            'defects.view', 'defects.view-any', 'defects.create', 'defects.update', 'defects.delete', 'defects.verify',
            'daily-logs.view', 'daily-logs.view-any', 'daily-logs.create', 'daily-logs.update', 'daily-logs.delete', 'daily-logs.approve',
            'safety.view', 'safety.view-any', 'safety.create', 'safety.update', 'safety.delete', 'safety.investigate', 'safety.close',
            'contracts.view', 'contracts.view-any', 'contracts.create', 'contracts.update', 'contracts.sign',
            'certificates.view', 'certificates.view-any', 'certificates.create', 'certificates.update', 'certificates.verify-site',
            'expenses.view', 'expenses.view-any', 'expenses.create', 'expenses.update', 'expenses.verify-site',
            'petty-cash.view', 'petty-cash.view-any', 'petty-cash.reconcile',
            'documents.view', 'documents.view-any', 'documents.create', 'documents.update', 'documents.download', 'documents.share',
            'reports.view-progress', 'reports.view-attendance', 'reports.view-inventory', 'reports.export',
            'notifications.view', 'notifications.create',
        ]);

        // 5. Customer Support Officer
        $supportOfficer = Role::findByName('Customer Support Officer', 'web');
        $supportOfficer->syncPermissions([
            'clients.view', 'clients.view-any', 'clients.create', 'clients.update', 'clients.export',
            'accounts.view', 'accounts.view-any', 'accounts.statement',
            'plots.view', 'plots.view-any', 'plots.view-history',
            'sites.view', 'sites.view-any', 'sites.view-progress',
            'units.view', 'units.view-any',
            'projects.view', 'projects.view-any',
            'documents.view', 'documents.view-any', 'documents.download',
            'notifications.view', 'notifications.create', 'notifications.send',
            'reports.view-progress',
        ]);

        // 6. Company Admin
        $companyAdmin = Role::findByName('Company Admin', 'web');
        $companyAdmin->syncPermissions([
            'users.view', 'users.view-any', 'users.create', 'users.update', 'users.assign-roles',
            'companies.view', 'companies.update', 'companies.manage-settings', 'companies.view-financials',
            'projects.view', 'projects.view-any', 'projects.create', 'projects.update', 'projects.delete', 'projects.archive', 'projects.restore', 'projects.manage-budget', 'projects.view-financials', 'projects.assign-team',
            'plots.view', 'plots.view-any', 'plots.create', 'plots.update', 'plots.assign-owner', 'plots.transfer-ownership', 'plots.view-history',
            'sites.view', 'sites.view-any', 'sites.create', 'sites.update', 'sites.manage-workers', 'sites.view-progress', 'sites.update-progress',
            'clients.view', 'clients.view-any', 'clients.create', 'clients.update', 'clients.export',
            'mother-titles.view', 'mother-titles.view-any', 'mother-titles.create', 'mother-titles.update', 'mother-titles.export',
            'employees.view', 'employees.view-any', 'employees.create', 'employees.update', 'employees.export',
            'cashbook.view', 'cashbook.view-any', 'cashbook.manage', 'cashbook.create', 'cashbook.export',
            'refunds.view', 'refunds.view-any', 'refunds.create', 'refunds.update', 'refunds.approve', 'refunds.process', 'refunds.export',
            'reconciliation.view', 'reconciliation.view-any', 'reconciliation.match', 'reconciliation.approve', 'reconciliation.export',
            'payments.view', 'payments.view-any', 'payments.create', 'payments.approve', 'payments.process',
            'expenses.view', 'expenses.view-any', 'expenses.create', 'expenses.update', 'expenses.delete', 'expenses.verify-site', 'expenses.approve-finance', 'expenses.authorize-admin', 'expenses.reimburse', 'expenses.pay', 'expenses.export',
            'petty-cash.view', 'petty-cash.view-any', 'petty-cash.create', 'petty-cash.update', 'petty-cash.delete', 'petty-cash.top-up', 'petty-cash.reconcile', 'petty-cash.export',
            'budgets.view', 'budgets.view-any', 'budgets.create', 'budgets.update', 'budgets.approve', 'budgets.allocate',
            'reports.view-financial', 'reports.view-progress', 'reports.view-attendance', 'reports.view-inventory', 'reports.view-analytics', 'reports.export',
            'documents.view', 'documents.view-any', 'documents.create', 'documents.update', 'documents.approve',
            'contracts.view', 'contracts.view-any', 'contracts.create', 'contracts.update', 'contracts.delete', 'contracts.sign', 'contracts.approve', 'contracts.terminate',
            'certificates.view', 'certificates.view-any', 'certificates.create', 'certificates.update', 'certificates.delete', 'certificates.verify-site', 'certificates.approve-finance', 'certificates.authorize-admin', 'certificates.pay', 'certificates.export',
            'equipment.view', 'equipment.view-any', 'equipment.create', 'equipment.update', 'equipment.delete', 'equipment.dispatch', 'equipment.maintain', 'equipment.log-utilization', 'equipment.assign-operator',
            'inspections.view', 'inspections.view-any', 'inspections.create', 'inspections.update', 'inspections.delete', 'inspections.sign-off',
            'defects.view', 'defects.view-any', 'defects.create', 'defects.update', 'defects.delete', 'defects.verify',
            'daily-logs.view', 'daily-logs.view-any', 'daily-logs.create', 'daily-logs.update', 'daily-logs.delete', 'daily-logs.approve',
            'safety.view', 'safety.view-any', 'safety.create', 'safety.update', 'safety.delete', 'safety.investigate', 'safety.close',
            'accounts.view', 'accounts.view-any', 'accounts.create', 'accounts.update', 'accounts.delete', 'accounts.activate', 'accounts.suspend', 'accounts.close', 'accounts.adjust-balance', 'accounts.statement',
            'transactions.view', 'transactions.view-any', 'transactions.create', 'transactions.reverse', 'transactions.reconcile', 'transactions.export',
        ]);

        // 7. Finance Officer (operational role)
        $financeOfficer = Role::findByName('Finance Officer', 'web');
        $financeOfficer->syncPermissions([
            'accounts.view', 'accounts.view-any', 'accounts.create', 'accounts.update', 'accounts.delete',
            'accounts.activate', 'accounts.suspend', 'accounts.close', 'accounts.adjust-balance', 'accounts.statement',
            'transactions.view', 'transactions.view-any', 'transactions.create', 'transactions.reverse', 'transactions.reconcile', 'transactions.export',
            'cashbook.view', 'cashbook.view-any', 'cashbook.create', 'cashbook.manage', 'cashbook.export',
            'payments.view', 'payments.view-any', 'payments.create', 'payments.update', 'payments.approve', 'payments.process', 'payments.refund', 'payments.export',
            'refunds.view', 'refunds.view-any', 'refunds.create', 'refunds.export',
            'invoices.view', 'invoices.view-any', 'invoices.create', 'invoices.update', 'invoices.send', 'invoices.approve', 'invoices.mark-paid', 'invoices.export',
            'expenses.view', 'expenses.view-any', 'expenses.create', 'expenses.update', 'expenses.delete', 'expenses.verify-site', 'expenses.approve-finance', 'expenses.authorize-admin', 'expenses.reimburse', 'expenses.pay', 'expenses.export',
            'petty-cash.view', 'petty-cash.view-any', 'petty-cash.create', 'petty-cash.update', 'petty-cash.delete', 'petty-cash.top-up', 'petty-cash.reconcile', 'petty-cash.export',
            'budgets.view', 'budgets.view-any', 'budgets.create', 'budgets.update', 'budgets.allocate',
            'contracts.view', 'contracts.view-any', 'contracts.create', 'contracts.update', 'contracts.approve',
            'certificates.view', 'certificates.view-any', 'certificates.create', 'certificates.update', 'certificates.approve-finance', 'certificates.pay', 'certificates.export',
            'projects.view', 'projects.view-any', 'projects.view-financials',
            'companies.view-financials',
            'reports.view-financial', 'reports.export',
            'documents.view', 'documents.view-any', 'documents.create',
            'audit-logs.view', 'audit-logs.view-any',
        ]);

        // 8. Site Manager (operational role)
        $siteManager = Role::findByName('Site Manager', 'web');
        $siteManager->syncPermissions([
            'sites.view', 'sites.view-any', 'sites.update', 'sites.manage-workers', 'sites.view-progress', 'sites.update-progress',
            'tasks.view', 'tasks.view-any', 'tasks.create', 'tasks.update', 'tasks.assign', 'tasks.complete',
            'workers.view', 'workers.view-any', 'workers.create', 'workers.update', 'workers.assign-to-site', 'workers.view-attendance',
            'attendance.view', 'attendance.view-any', 'attendance.create', 'attendance.update', 'attendance.approve',
            'materials.view', 'materials.view-any', 'materials.request', 'materials.track-usage', 'materials.view-inventory',
            'equipment.view', 'equipment.view-any', 'equipment.dispatch', 'equipment.maintain', 'equipment.log-utilization', 'equipment.assign-operator',
            'inspections.view', 'inspections.view-any', 'inspections.create', 'inspections.update', 'inspections.delete', 'inspections.sign-off',
            'defects.view', 'defects.view-any', 'defects.create', 'defects.update', 'defects.verify',
            'daily-logs.view', 'daily-logs.view-any', 'daily-logs.create', 'daily-logs.update', 'daily-logs.delete', 'daily-logs.approve',
            'safety.view', 'safety.view-any', 'safety.create', 'safety.update', 'safety.investigate', 'safety.close',
            'accounts.view', 'accounts.view-any', 'accounts.statement',
            'transactions.view', 'transactions.view-any',
            'contracts.view', 'contracts.view-any', 'contracts.create', 'contracts.update',
            'certificates.view', 'certificates.view-any', 'certificates.create', 'certificates.update', 'certificates.verify-site',
            'expenses.view', 'expenses.view-any', 'expenses.create', 'expenses.update', 'expenses.verify-site',
            'petty-cash.view', 'petty-cash.view-any', 'petty-cash.reconcile',
            'documents.view', 'documents.view-any', 'documents.create',
            'reports.view-progress', 'reports.view-attendance', 'reports.view-inventory',
            'notifications.view', 'notifications.create',
        ]);

        // 9. Supervisor
        $supervisor = Role::findByName('Supervisor', 'web');
        $supervisor->syncPermissions([
            'sites.view', 'sites.view-progress', 'sites.update-progress',
            'tasks.view', 'tasks.view-any', 'tasks.create', 'tasks.update', 'tasks.assign', 'tasks.complete',
            'workers.view', 'workers.view-any', 'workers.clock-in', 'workers.clock-out', 'workers.view-attendance',
            'attendance.view', 'attendance.view-any', 'attendance.create', 'attendance.update',
            'materials.view', 'materials.request', 'materials.track-usage',
            'equipment.view', 'equipment.view-any', 'equipment.log-utilization',
            'inspections.view', 'inspections.view-any', 'inspections.create', 'inspections.update', 'inspections.sign-off',
            'defects.view', 'defects.view-any', 'defects.create', 'defects.update', 'defects.verify',
            'daily-logs.view', 'daily-logs.view-any', 'daily-logs.create', 'daily-logs.update',
            'safety.view', 'safety.view-any', 'safety.create', 'safety.update', 'safety.investigate',
            'expenses.view', 'expenses.create',
            'petty-cash.view',
            'documents.view', 'documents.create',
            'reports.view-progress', 'reports.view-attendance',
            'notifications.view',
        ]);

        // 10. Worker
        $worker = Role::findByName('Worker', 'web');
        $worker->syncPermissions([
            'tasks.view', 'tasks.view-assigned', 'tasks.update', 'tasks.complete',
            'workers.clock-in', 'workers.clock-out',
            'attendance.view',
            'materials.view',
            'inspections.view',
            'defects.view', 'defects.update',
            'daily-logs.view',
            'safety.view', 'safety.create',
            'documents.view',
            'notifications.view',
        ]);

        // 11. Client
        $client = Role::findByName('Client', 'web');
        $client->syncPermissions([
            'accounts.view',
            'accounts.statement',
            'transactions.view',
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

        $this->command?->info('Role-specific permissions synchronized across all 11 roles successfully!');
    }
}
