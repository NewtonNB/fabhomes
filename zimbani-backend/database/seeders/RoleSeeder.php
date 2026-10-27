<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Define the official Fab Homes roles + operational sub-roles
        $roles = [
            [
                'name' => 'Super Admin',
                'guard_name' => 'web',
                'description' => 'Full system access with all permissions. Can manage system configuration, users, and all modules.',
            ],
            [
                'name' => 'Finance Manager',
                'guard_name' => 'web',
                'description' => 'Oversees financial accounts, savings schemes, payments, cashbook, petty cash, claims, and refunds.',
            ],
            [
                'name' => 'Reconciliation Manager',
                'guard_name' => 'web',
                'description' => 'Specialized role for bank and mobile money transaction matching, escrow, and audit reconciliation.',
            ],
            [
                'name' => 'Surveyor Manager',
                'guard_name' => 'web',
                'description' => 'Oversees estates, mother titles, plot surveys, deed plans, and boundary allocations.',
            ],
            [
                'name' => 'Construction / Project Manager',
                'guard_name' => 'web',
                'description' => 'Directs civil construction sites, bill of quantities, daily progress, inspections, and materials.',
            ],
            [
                'name' => 'Customer Support Officer',
                'guard_name' => 'web',
                'description' => 'Manages client onboarding (KYC), inquiries, support tickets, and communication.',
            ],
            [
                'name' => 'Company Admin',
                'guard_name' => 'web',
                'description' => 'Company-level administrator. Can manage company settings, projects, users, and operations.',
            ],
            [
                'name' => 'Site Manager',
                'guard_name' => 'web',
                'description' => 'Construction site manager. Can oversee site operations, workers, materials, and daily progress reporting.',
            ],
            [
                'name' => 'Supervisor',
                'guard_name' => 'web',
                'description' => 'Site supervisor. Can manage workers, track daily activities, and report progress.',
            ],
            [
                'name' => 'Worker',
                'guard_name' => 'web',
                'description' => 'Construction worker. Can clock in/out, view assigned tasks, and update task progress.',
            ],
            [
                'name' => 'Finance Officer',
                'guard_name' => 'web',
                'description' => 'Financial operations officer. Can manage payments, invoices, expenses, and financial reporting.',
            ],
            [
                'name' => 'Client',
                'guard_name' => 'web',
                'description' => 'Property client/saver. Can view personal savings, plots, statements, and construction progress.',
            ],
        ];

        // Create or update each role
        foreach ($roles as $roleData) {
            Role::firstOrCreate(
                ['name' => $roleData['name'], 'guard_name' => $roleData['guard_name']]
            );

            $this->command?->info("Configured role: {$roleData['name']}");
        }

        $this->command?->info('All core and operational roles configured successfully!');
    }
}
