<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Extend savings_accounts to support Tuzimbe Group Scheme
        Schema::table('savings_accounts', function (Blueprint $table) {
            $table->string('group_code', 50)->nullable()->after('scheme_name');
            $table->string('cohort_year', 10)->nullable()->after('group_code');
            $table->string('package_code', 50)->nullable()->after('cohort_year');
        });

        // Modify enum for MySQL or change column to string for maximum compatibility
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE savings_accounts MODIFY COLUMN account_type ENUM('land_saving', 'construction_saving', 'tuzimbe_group') NOT NULL DEFAULT 'land_saving'");
        }

        // 2. Create scheme_transfers table (Legacy Manual Section 2.7: Transfer Requests)
        Schema::create('scheme_transfers', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('from_savings_account_id')->nullable()->constrained('savings_accounts')->onDelete('set null');
            $table->foreignId('to_savings_account_id')->nullable()->constrained('savings_accounts')->onDelete('set null');
            $table->string('from_scheme_name', 150);
            $table->string('to_scheme_name', 150);
            $table->decimal('amount', 15, 2);
            $table->text('reason')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('requested_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['client_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scheme_transfers');

        Schema::table('savings_accounts', function (Blueprint $table) {
            $table->dropColumn(['group_code', 'cohort_year', 'package_code']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE savings_accounts MODIFY COLUMN account_type ENUM('land_saving', 'construction_saving') NOT NULL DEFAULT 'land_saving'");
        }
    }
};
