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
        // 1. Bank Reconciliation Batches
        Schema::create('bank_reconciliation_batches', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('batch_number', 50)->unique(); // BNK-REC-YYYYMM-XXXX
            $table->string('bank_name', 100)->default('Stanbic Bank Uganda');
            $table->string('account_number', 50)->default('9030018274619');
            $table->string('currency', 3)->default('UGX');
            $table->date('statement_period_start');
            $table->date('statement_period_end');
            $table->decimal('opening_balance', 15, 2)->default(0.00);
            $table->decimal('closing_balance', 15, 2)->default(0.00);
            $table->decimal('total_credits', 15, 2)->default(0.00);
            $table->decimal('total_debits', 15, 2)->default(0.00);
            $table->unsignedInteger('total_entries_count')->default(0);
            $table->unsignedInteger('matched_entries_count')->default(0);
            $table->unsignedInteger('unmatched_entries_count')->default(0);
            $table->decimal('variance_amount', 15, 2)->default(0.00);
            $table->enum('status', ['uploaded', 'processing', 'reconciled', 'discrepancy_flagged'])->default('uploaded');
            $table->foreignId('reconciled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reconciled_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['bank_name', 'status']);
            $table->index('statement_period_end');
        });

        // 2. Bank Statement Entries (Staging Lines)
        Schema::create('bank_statement_entries', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('batch_id')->constrained('bank_reconciliation_batches')->onDelete('cascade');
            $table->string('entry_reference', 50)->unique(); // STMT-YYYYMM-XXXX
            $table->string('bank_transaction_id', 100)->nullable();
            $table->date('value_date');
            $table->date('booking_date')->nullable();
            $table->string('narration', 500);
            $table->enum('entry_type', ['credit', 'debit']);
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('UGX');
            $table->decimal('running_balance', 15, 2)->nullable();
            $table->enum('matching_status', [
                'unmatched',
                'matched_exact',
                'matched_fuzzy',
                'discrepancy',
                'manually_cleared'
            ])->default('unmatched');
            $table->unsignedTinyInteger('match_confidence_score')->default(0);
            $table->foreignId('matched_payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->foreignId('matched_payment_intent_id')->nullable()->constrained('payment_intents')->nullOnDelete();
            $table->foreignId('matched_transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->string('matching_rule', 100)->nullable(); // exact_reference, amount_date_window, fuzzy_payer_name, manual
            $table->text('discrepancy_notes')->nullable();
            $table->timestamps();

            $table->index(['batch_id', 'matching_status']);
            $table->index('bank_transaction_id');
            $table->index('value_date');
        });

        // 3. Payment Simulations & Sandbox Scenario Runs
        Schema::create('payment_simulations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('simulation_run_id', 50)->unique(); // SIM-YYYYMM-XXXX
            $table->string('scenario_name', 100);
            $table->enum('channel', ['card', 'mobile_money', 'bank_transfer']);
            $table->string('gateway_name', 50);
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('UGX');
            $table->enum('status', ['running', 'passed', 'failed'])->default('running');
            $table->json('steps_executed')->nullable();
            $table->foreignId('payment_intent_id')->nullable()->constrained('payment_intents')->nullOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->foreignId('webhook_log_id')->nullable()->constrained('payment_webhook_logs')->nullOnDelete();
            $table->foreignId('refund_id')->nullable()->constrained('payment_refunds')->nullOnDelete();
            $table->foreignId('dispute_id')->nullable()->constrained('payment_disputes')->nullOnDelete();
            $table->unsignedInteger('execution_duration_ms')->default(0);
            $table->unsignedSmallInteger('assertions_count')->default(0);
            $table->unsignedSmallInteger('passed_assertions_count')->default(0);
            $table->text('error_message')->nullable();
            $table->foreignId('executed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['scenario_name', 'status']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_simulations');
        Schema::dropIfExists('bank_statement_entries');
        Schema::dropIfExists('bank_reconciliation_batches');
    }
};
