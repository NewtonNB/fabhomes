<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$user = User::create([
    'name' => 'Super Admin',
    'email' => 'admin@zimbani.com',
    'phone' => '+256700000000',
    'password' => Hash::make('password'),
    'status' => 'active',
    'email_verified_at' => now()
]);

$user->assignRole('Super Admin');

echo "Admin user created successfully!\n";
echo "Email: admin@zimbani.com\n";
echo "Password: password\n";
