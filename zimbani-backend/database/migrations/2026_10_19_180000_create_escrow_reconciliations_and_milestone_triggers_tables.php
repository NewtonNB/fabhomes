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
        // 1. Escrow Reconciliations Table
        Schema::create('escrow_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('reconciliation_number', 50)->unique();
            $table->foreignId('savings_account_id')->constrained('savings_accounts')->onDelete('cascade');
            $table->foreignId('project_id')->nullable()->constrained('projects')->onDelete('set null');
            $table->string('institution_name', 150);
            $table->string('statement_reference', 100)->nullable();
            $table->date('statement_date');
            $table->decimal('statement_balance', 14, 2);
            $table->decimal('book_balance', 14, 2);
            $table->decimal('variance_amount', 14, 2)->default(0.00);
            $table->string('currency', 3)->default('USD');
            $table->integer('matched_items_count')->default(0);
            $table->integer('unmatched_items_count')->default(0);
            $table->enum('status', ['draft', 'reconciled', 'variance_detected', 'approved', 'disputed'])->default('draft');
            $table->text('notes')->nullable();
            $table->foreignId('reconciled_by')->nullable()->constrained('users')->onDelete('set null');
            $table->dateTime('reconciled_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->dateTime('approved_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['savings_account_id', 'statement_date'], 'escrow_rec_account_date_idx');
            $table->index('status');
        });

        // 2. Escrow Reconciliation Items Table
        Schema::create('escrow_reconciliation_items', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->foreignId('escrow_reconciliation_id')->constrained('escrow_reconciliations')->onDelete('cascade');
            $table->foreignId('transaction_id')->nullable()->constrained('transactions')->onDelete('set null');
            $table->foreignId('milestone_payment_release_id')->nullable()->constrained('milestone_payment_releases')->onDelete('set null');
            $table->enum('item_type', [
                'deposit_matched',
                'disbursement_matched',
                'deposit_in_transit',
                'outstanding_disbursement',
                'bank_charge',
                'interest_credit',
                'timing_difference',
                'unexplained_variance',
            ]);
            $table->string('external_reference', 100)->nullable();
            $table->date('external_date')->nullable();
            $table->decimal('statement_amount', 14, 2)->default(0.00);
            $table->decimal('ledger_amount', 14, 2)->default(0.00);
            $table->decimal('variance', 14, 2)->default(0.00);
            $table->enum('status', ['matched', 'unmatched', 'resolved', 'disputed'])->default('matched');
            $table->text('notes')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->dateTime('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['escrow_reconciliation_id', 'status'], 'eri_rec_status_idx');
        });

        // 3. Milestone Trigger Logs Table
        Schema::create('milestone_trigger_logs', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->foreignId('milestone_verification_id')->constrained('milestone_verifications')->onDelete('cascade');
            $table->foreignId('milestone_payment_release_id')->nullable()->constrained('milestone_payment_releases')->onDelete('set null');
            $table->foreignId('savings_account_id')->nullable()->constrained('savings_accounts')->onDelete('set null');
            $table->string('trigger_event', 50)->default('client_approved');
            $table->enum('status', [
                'success_authorized',
                'success_disbursed',
                'insufficient_escrow_funds',
                'no_escrow_account',
                'already_processed',
                'failed',
            ]);
            $table->decimal('escrow_balance', 14, 2)->default(0.00);
            $table->decimal('required_amount', 14, 2)->default(0.00);
            $table->decimal('shortfall_amount', 14, 2)->default(0.00);
            $table->json('details')->nullable();
            $table->foreignId('triggered_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index(['milestone_verification_id', 'status'], 'mtl_verif_status_idx');
            $table->index('trigger_event');
        });

        // 4. Add auto_release_triggered to milestone_verifications
        Schema::table('milestone_verifications', function (Blueprint $table) {
            $table->boolean('auto_release_triggered')->default(false)->after('rejection_reason');
            $table->string('auto_release_status', 50)->nullable()->after('auto_release_triggered');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('milestone_verifications', function (Blueprint $table) {
            $table->dropColumn(['auto_release_triggered', 'auto_release_status']);
        });

        Schema::dropIfExists('milestone_trigger_logs');
        Schema::dropIfExists('escrow_reconciliation_items');
        Schema::dropIfExists('escrow_reconciliations');
    }
};
