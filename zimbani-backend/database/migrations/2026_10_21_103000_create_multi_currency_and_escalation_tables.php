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
        // 1. Foreign Exchange Rates Table
        Schema::create('fx_exchange_rates', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('base_currency', 3)->index();
            $table->string('target_currency', 3)->default('UGX')->index();
            $table->decimal('spot_rate', 15, 6);
            $table->decimal('buy_rate', 15, 6);
            $table->decimal('sell_rate', 15, 6);
            $table->string('source', 50)->default('bank_of_uganda');
            $table->date('rate_date')->index();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['base_currency', 'target_currency', 'rate_date'], 'uq_fx_currency_date');
        });

        // 2. Diaspora Forward FX Hedging Contracts
        Schema::create('fx_hedging_contracts', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('contract_number', 50)->unique();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('savings_account_id')->nullable()->constrained('savings_accounts')->nullOnDelete();
            $table->foreignId('milestone_savings_pool_id')->nullable()->constrained('milestone_savings_pools')->nullOnDelete();
            $table->string('base_currency', 3); // USD, GBP, EUR, KES
            $table->string('target_currency', 3)->default('UGX');
            $table->decimal('locked_exchange_rate', 15, 6);
            $table->decimal('committed_amount_foreign', 15, 2);
            $table->decimal('guaranteed_amount_local', 15, 2);
            $table->decimal('utilized_amount_foreign', 15, 2)->default(0.00);
            $table->decimal('utilized_amount_local', 15, 2)->default(0.00);
            $table->date('effective_date');
            $table->date('expiry_date');
            $table->enum('status', ['active', 'fully_utilized', 'expired', 'cancelled'])->default('active');
            $table->decimal('premium_fee_percentage', 5, 2)->default(0.00);
            $table->decimal('premium_fee_amount', 15, 2)->default(0.00);
            $table->text('notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['client_id', 'status']);
            $table->index(['base_currency', 'target_currency']);
            $table->index('expiry_date');
        });

        // 3. Construction Material Price Indices (Basket Definition)
        Schema::create('material_price_indices', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('index_code', 50)->unique();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->enum('project_type', ['residential', 'commercial', 'infrastructure', 'mixed_use'])->default('residential');
            $table->string('base_period', 20)->default('2026-Q1');
            $table->decimal('base_index_value', 8, 4)->default(100.0000);
            $table->decimal('current_index_value', 8, 4)->default(100.0000);
            $table->decimal('escalation_percentage', 6, 2)->default(0.00);
            $table->decimal('tolerance_threshold_percentage', 5, 2)->default(5.00);
            $table->boolean('is_active')->default(true);
            $table->dateTime('last_calculated_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['project_type', 'is_active']);
        });

        // 4. Material Price Records & Basket Components
        Schema::create('material_price_records', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->foreignId('material_price_index_id')->constrained('material_price_indices')->cascadeOnDelete();
            $table->foreignId('material_id')->nullable()->constrained('materials')->nullOnDelete();
            $table->string('item_code', 50);
            $table->string('item_name', 255);
            $table->string('unit_of_measure', 30);
            $table->decimal('basket_weight_percentage', 5, 2); // e.g. 30.00%
            $table->decimal('base_unit_price', 15, 2);
            $table->decimal('current_unit_price', 15, 2);
            $table->decimal('price_variance_percentage', 6, 2)->default(0.00);
            $table->string('currency', 3)->default('UGX');
            $table->string('survey_source', 150)->nullable();
            $table->date('effective_date');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['material_price_index_id', 'item_code'], 'idx_mpi_item');
            $table->index('effective_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('material_price_records');
        Schema::dropIfExists('material_price_indices');
        Schema::dropIfExists('fx_hedging_contracts');
        Schema::dropIfExists('fx_exchange_rates');
    }
};
