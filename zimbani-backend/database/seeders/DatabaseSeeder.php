<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed roles first
        $this->call(RoleSeeder::class);
        
        // Seed permissions and assign to roles
        $this->call(PermissionSeeder::class);
        
        // Create a Super Admin user for testing
        $superAdmin = User::create([
            'uuid' => \Illuminate\Support\Str::uuid(),
            'name' => 'Super Admin',
            'email' => 'admin@zimbani.com',
            'phone' => '+256700000000',
            'password' => bcrypt('password'),
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        
        $superAdmin->assignRole('Super Admin');
        
        $this->command->info('Super Admin user created: admin@zimbani.com / password');
    }
}
