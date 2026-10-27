<?php

namespace App\Console\Commands;

use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class WipeDemoDataCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'zimbani:wipe-demo-data {--force : Force execution without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Wipe all demo operational records (clients, plots, payments, savings, projects) while strictly preserving roles, permissions, and super admin user.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->warn('========================================================');
        $this->warn('  FAB HOMES / ZIMBANI PLATFORM - DEMO DATA WIPE DESK    ');
        $this->warn('========================================================');

        if (!$this->option('force') && !$this->confirm('Are you sure you want to wipe all demo operational data from the database? This cannot be undone.')) {
            $this->info('Operation cancelled.');
            return 0;
        }

        $this->info('Disabling foreign key constraints...');
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        $tablesToWipe = [
            'payment_refunds',
            'scheme_transfers',
            'petty_cash_transactions',
            'petty_cash_accounts',
            'plot_reservations',
            'land_title_deeds',
            'mother_title_transfers',
            'mother_titles',
            'payments',
            'transactions',
            'savings_pool_allocations',
            'milestone_savings_pools',
            'construction_saving_schemes',
            'savings_accounts',
            'units',
            'site_daily_logs',
            'site_inspections',
            'sites',
            'tasks',
            'construction_milestones',
            'project_budgets',
            'projects',
            'companies',
            'client_security_profiles',
            'clients',
            'employee_leave_requests',
            'employees',
            'departments',
            'support_ticket_messages',
            'support_tickets',
            'offline_sync_logs',
            'payment_disputes',
            'payment_certificates',
            'bank_statement_entries',
            'bank_reconciliation_batches',
            'material_usages',
            'material_requisitions',
            'materials',
            'equipment_dispatches',
            'equipment_maintenance_logs',
            'equipment_utilization_logs',
            'equipment',
            'scheduled_reports',
            'activities',
            'security_audit_logs',
        ];

        $wipedCount = 0;
        foreach ($tablesToWipe as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->truncate();
                $this->line("  ✓ Truncated demo table: <comment>{$table}</comment>");
                $wipedCount++;
            }
        }

        // Delete non-super-admin demo users
        $superAdminEmails = ['admin@zimbani.com', 'admin@fabhomes.ug'];
        $deletedUsers = DB::table('users')->whereNotIn('email', $superAdminEmails)->delete();
        $this->line("  ✓ Removed {$deletedUsers} demo test users.");

        $this->info('Re-enabling foreign key constraints...');
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // Ensure roles & permissions are seeded and fresh
        $this->info('Verifying security roles and permissions...');
        $this->call('db:seed', ['--class' => RoleSeeder::class, '--force' => true]);
        $this->call('db:seed', ['--class' => PermissionSeeder::class, '--force' => true]);

        // Ensure Super Admin user exists
        $admin = User::firstOrCreate(
            ['email' => 'admin@zimbani.com'],
            [
                'uuid' => (string) Str::uuid(),
                'name' => 'Super Admin',
                'phone' => '+256700000000',
                'password' => bcrypt('password'),
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );
        $admin->syncRoles(['Super Admin']);

        $this->newLine();
        $this->info("========================================================");
        $this->info("  DEMO DATA WIPE COMPLETE! ({$wipedCount} tables cleaned)       ");
        $this->info("  Clean slate ready for live operations.                ");
        $this->info("  Active Admin: admin@zimbani.com / password             ");
        $this->info("========================================================");

        return 0;
    }
}
