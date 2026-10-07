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

        // Define the 7 core system roles with their descriptions
        $roles = [
            [
                'name' => 'Super Admin',
                'guard_name' => 'web',
                'description' => 'Full system access with all permissions. Can manage system configuration, users, and all modules.',
            ],
            [
                'name' => 'Company Admin',
                'guard_name' => 'web',
                'description' => 'Company-level administrator. Can manage company settings, projects, users, and financial operations within their company.',
            ],
            [
                'name' => 'Site Manager',
                'guard_name' => 'web',
                'description' => 'Construction site manager. Can oversee site operations, workers, materials, and daily progress reporting.',
            ],
            [
                'name' => 'Supervisor',
                'guard_name' => 'web',
                'description' => 'Site supervisor. Can manage workers, track daily activities, and report progress to site managers.',
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
                'description' => 'Property client/owner. Can view project progress, financials, and communicate with project team.',
            ],
        ];

        // Create each role
        foreach ($roles as $roleData) {
            Role::create([
                'name' => $roleData['name'],
                'guard_name' => $roleData['guard_name'],
            ]);

            $this->command->info("Created role: {$roleData['name']}");
        }

        $this->command->info('All roles created successfully!');
    }
}
