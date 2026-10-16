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
        // 1. Petty Cash Accounts / Site Floats Table
        Schema::create('petty_cash_accounts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('account_number', 50)->unique();
            $table->string('name', 255);
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->foreignId('custodian_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('float_limit', 15, 2)->default(0.00);
            $table->decimal('current_balance', 15, 2)->default(0.00);
            $table->string('currency', 3)->default('UGX');
            $table->enum('status', ['active', 'suspended', 'closed'])->default('active');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'status']);
            $table->index(['site_id', 'status']);
            $table->index('custodian_id');
        });

        // 2. Expense Claims & Direct Site Purchases Table
        Schema::create('expense_claims', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('claim_number', 50)->unique();
            $table->foreignId('claimant_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('petty_cash_account_id')->nullable()->constrained('petty_cash_accounts')->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->enum('claim_type', [
                'petty_cash_reimbursement',
                'direct_site_purchase',
                'travel_mileage',
                'emergency_materials',
                'site_utilities',
                'other',
            ])->default('direct_site_purchase');
            $table->enum('expense_category', [
                'materials',
                'fuel_oil',
                'tools_hardware',
                'transport',
                'labour_welfare',
                'equipment_hire',
                'statutory_permits',
                'office_admin',
                'other',
            ])->default('materials');
            $table->string('title', 255);
            $table->date('expense_date');
            $table->decimal('total_amount', 15, 2)->default(0.00);
            $table->string('currency', 3)->default('UGX');
            $table->enum('payment_method', [
                'petty_cash',
                'bank_transfer',
                'mobile_money',
                'cash',
                'company_card',
            ])->default('petty_cash');
            $table->string('vendor_name', 255)->nullable();
            $table->string('vendor_tin', 100)->nullable();
            $table->string('receipt_number', 100)->nullable();
            $table->text('description');
            $table->enum('status', [
                'draft',
                'submitted',
                'verified_by_site_manager',
                'approved_by_finance',
                'authorized_by_admin',
                'reimbursed',
                'rejected',
            ])->default('draft');

            // Multi-tier sign-off audit columns
            $table->foreignId('site_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('site_manager_signed_at')->nullable();
            $table->text('site_manager_notes')->nullable();

            $table->foreignId('finance_officer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('finance_officer_approved_at')->nullable();
            $table->text('finance_officer_notes')->nullable();

            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('admin_authorized_at')->nullable();
            $table->text('admin_notes')->nullable();

            $table->foreignId('paid_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('paid_at')->nullable();
            $table->string('payment_reference', 100)->nullable();
            $table->text('rejection_reason')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['claimant_id', 'status']);
            $table->index(['project_id', 'status']);
            $table->index(['site_id', 'status']);
            $table->index('expense_date');
        });

        // 3. Expense Line Items Table
        Schema::create('expense_items', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('expense_claim_id')->constrained('expense_claims')->cascadeOnDelete();
            $table->string('item_description', 255);
            $table->enum('expense_category', [
                'materials',
                'fuel_oil',
                'tools_hardware',
                'transport',
                'labour_welfare',
                'equipment_hire',
                'statutory_permits',
                'office_admin',
                'other',
            ]);
            $table->decimal('quantity', 10, 2)->default(1.00);
            $table->string('unit_of_measure', 50)->nullable();
            $table->decimal('unit_price', 15, 2)->default(0.00);
            $table->decimal('total_price', 15, 2)->default(0.00);
            $table->string('receipt_reference', 100)->nullable();
            $table->timestamps();

            $table->index(['expense_claim_id', 'expense_category']);
        });

        // 4. Petty Cash Transactions (Immutable Ledger for Float Top-ups & Disbursements)
        Schema::create('petty_cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('transaction_number', 50)->unique();
            $table->foreignId('petty_cash_account_id')->constrained('petty_cash_accounts')->cascadeOnDelete();
            $table->enum('transaction_type', [
                'initial_allocation',
                'replenishment',
                'expense_disbursement',
                'return_of_funds',
            ]);
            $table->decimal('amount', 15, 2);
            $table->decimal('balance_before', 15, 2);
            $table->decimal('balance_after', 15, 2);
            $table->string('currency', 3)->default('UGX');
            $table->foreignId('expense_claim_id')->nullable()->constrained('expense_claims')->nullOnDelete();
            $table->string('reference_number', 100)->nullable();
            $table->string('description', 255);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['petty_cash_account_id', 'created_at']);
            $table->index('transaction_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('petty_cash_transactions');
        Schema::dropIfExists('expense_items');
        Schema::dropIfExists('expense_claims');
        Schema::dropIfExists('petty_cash_accounts');
    }
};
