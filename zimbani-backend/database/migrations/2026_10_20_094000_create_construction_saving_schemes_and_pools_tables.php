<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create construction_saving_schemes table (Standardized or Custom templates)
        Schema::create('construction_saving_schemes', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('scheme_code', 50)->unique(); // e.g. CSS-VILLA-4BR, CSS-BUNGALOW-3BR, CSS-CUSTOM
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->string('project_type', 50)->default('residential'); // residential, commercial, mixed_use
            $table->char('currency', 3)->default('UGX');
            $table->decimal('standard_target_amount', 15, 2)->default(0.00);
            $table->decimal('minimum_initial_deposit', 15, 2)->default(0.00);
            $table->decimal('minimum_milestone_threshold_percentage', 5, 2)->default(100.00); // 100% funding needed to start milestone
            $table->boolean('waterfall_auto_allocation')->default(true); // Waterfall into sequence order
            $table->boolean('is_active')->default(true);
            $table->json('milestone_template')->nullable(); // Array of [{tier_order, name, weight_percentage, description}]
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_type', 'is_active'], 'idx_css_type_active');
        });

        // 2. Alter savings_accounts to link to construction saving schemes
        if (Schema::hasTable('savings_accounts')) {
            Schema::table('savings_accounts', function (Blueprint $table) {
                if (!Schema::hasColumn('savings_accounts', 'construction_saving_scheme_id')) {
                    $table->foreignId('construction_saving_scheme_id')
                        ->nullable()
                        ->after('project_id')
                        ->constrained('construction_saving_schemes')
                        ->nullOnDelete();
                }
                if (!Schema::hasColumn('savings_accounts', 'is_waterfall_allocation_enabled')) {
                    $table->boolean('is_waterfall_allocation_enabled')
                        ->default(true)
                        ->after('construction_saving_scheme_id');
                }
                if (!Schema::hasColumn('savings_accounts', 'total_allocated_to_pools')) {
                    $table->decimal('total_allocated_to_pools', 15, 2)
                        ->default(0.00)
                        ->after('is_waterfall_allocation_enabled');
                }
                if (!Schema::hasColumn('savings_accounts', 'total_locked_in_pools')) {
                    $table->decimal('total_locked_in_pools', 15, 2)
                        ->default(0.00)
                        ->after('total_allocated_to_pools');
                }
            });
        }

        // 3. Create milestone_savings_pools table (Tiered Milestone Savings Pools)
        Schema::create('milestone_savings_pools', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('pool_code', 50)->unique(); // e.g. POOL-202610-0001
            $table->foreignId('savings_account_id')->constrained('savings_accounts')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('construction_milestone_id')->nullable()->constrained('construction_milestones')->nullOnDelete();

            $table->integer('tier_order')->default(1); // 1 = Substructure, 2 = Superstructure, 3 = Roofing, etc.
            $table->string('milestone_name', 255);
            $table->text('description')->nullable();

            $table->decimal('target_amount', 15, 2)->default(0.00);
            $table->decimal('allocated_amount', 15, 2)->default(0.00);
            $table->decimal('locked_amount', 15, 2)->default(0.00);
            $table->decimal('disbursed_amount', 15, 2)->default(0.00);
            $table->char('currency', 3)->default('UGX');
            $table->decimal('weight_percentage', 5, 2)->default(0.00);

            $table->enum('status', [
                'unfunded',
                'partially_funded',
                'fully_funded',
                'locked',
                'partially_disbursed',
                'fully_disbursed',
            ])->default('unfunded');

            $table->timestamp('funded_at')->nullable();
            $table->timestamp('commenced_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['savings_account_id', 'status'], 'idx_msp_acc_status');
            $table->index(['project_id', 'tier_order'], 'idx_msp_proj_tier');
        });

        // 4. Create savings_pool_allocations table (Ledger of pool fund movements)
        Schema::create('savings_pool_allocations', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->foreignId('savings_account_id')->constrained('savings_accounts')->cascadeOnDelete();
            $table->foreignId('milestone_savings_pool_id')->constrained('milestone_savings_pools')->cascadeOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->foreignId('milestone_payment_release_id')->nullable()->constrained('milestone_payment_releases')->nullOnDelete();
            $table->foreignId('source_pool_id')->nullable()->constrained('milestone_savings_pools')->nullOnDelete();

            $table->enum('allocation_type', [
                'deposit_allocation',
                'manual_rebalance',
                'escrow_lock',
                'milestone_disbursement',
                'refund_unlock',
            ]);

            $table->decimal('amount', 15, 2);
            $table->decimal('balance_before', 15, 2);
            $table->decimal('balance_after', 15, 2);
            $table->string('reference_number', 50)->unique();
            $table->text('notes')->nullable();
            $table->foreignId('allocated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['savings_account_id', 'allocation_type'], 'idx_spa_acc_type');
            $table->index(['milestone_savings_pool_id', 'created_at'], 'idx_spa_pool_date');
        });

        // 5. Alter construction_milestones to link back to savings pool
        if (Schema::hasTable('construction_milestones')) {
            Schema::table('construction_milestones', function (Blueprint $table) {
                if (!Schema::hasColumn('construction_milestones', 'milestone_savings_pool_id')) {
                    $table->foreignId('milestone_savings_pool_id')
                        ->nullable()
                        ->after('project_id')
                        ->constrained('milestone_savings_pools')
                        ->nullOnDelete();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('construction_milestones')) {
            Schema::table('construction_milestones', function (Blueprint $table) {
                if (Schema::hasColumn('construction_milestones', 'milestone_savings_pool_id')) {
                    $table->dropForeign(['milestone_savings_pool_id']);
                    $table->dropColumn('milestone_savings_pool_id');
                }
            });
        }

        Schema::dropIfExists('savings_pool_allocations');
        Schema::dropIfExists('milestone_savings_pools');

        if (Schema::hasTable('savings_accounts')) {
            Schema::table('savings_accounts', function (Blueprint $table) {
                if (Schema::hasColumn('savings_accounts', 'construction_saving_scheme_id')) {
                    $table->dropForeign(['construction_saving_scheme_id']);
                    $table->dropColumn('construction_saving_scheme_id');
                }
                if (Schema::hasColumn('savings_accounts', 'is_waterfall_allocation_enabled')) {
                    $table->dropColumn('is_waterfall_allocation_enabled');
                }
                if (Schema::hasColumn('savings_accounts', 'total_allocated_to_pools')) {
                    $table->dropColumn('total_allocated_to_pools');
                }
                if (Schema::hasColumn('savings_accounts', 'total_locked_in_pools')) {
                    $table->dropColumn('total_locked_in_pools');
                }
            });
        }

        Schema::dropIfExists('construction_saving_schemes');
    }
};
