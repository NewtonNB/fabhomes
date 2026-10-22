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
        // 1. Payment Refunds Ledger
        Schema::create('payment_refunds', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('refund_number', 50)->unique(); // REF-YYYYMM-XXXX

            // Associations
            $table->foreignId('payment_id')->constrained('payments')->onDelete('cascade');
            $table->foreignId('payment_intent_id')->nullable()->constrained('payment_intents')->nullOnDelete();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('savings_account_id')->nullable()->constrained('savings_accounts')->nullOnDelete();
            $table->foreignId('reversal_transaction_id')->nullable()->constrained('transactions')->nullOnDelete();

            // Financial amounts
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('UGX');
            $table->decimal('fee_refunded', 10, 2)->default(0.00);

            // Classification & Lifecycle
            $table->enum('reason_category', [
                'escrow_surplus',
                'duplicate_payment',
                'client_cancellation',
                'milestone_variation',
                'disputed_chargeback',
                'other'
            ])->default('other');
            $table->text('reason_description');

            $table->enum('status', [
                'requested',
                'approved',
                'processing',
                'completed',
                'rejected'
            ])->default('requested');

            // Approvals & Processing
            $table->foreignId('requested_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('processed_at')->nullable();

            // Gateway Settlement
            $table->string('gateway_refund_reference')->nullable();
            $table->json('gateway_response')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'created_at']);
            $table->index(['client_id', 'status']);
            $table->index('payment_id');
        });

        // 2. Payment Disputes & Chargeback Resolution Ledger
        Schema::create('payment_disputes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('dispute_number', 50)->unique(); // DSP-YYYYMM-XXXX

            // Associations
            $table->foreignId('payment_id')->constrained('payments')->onDelete('cascade');
            $table->foreignId('payment_intent_id')->nullable()->constrained('payment_intents')->nullOnDelete();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('refund_id')->nullable()->constrained('payment_refunds')->nullOnDelete();

            // Dispute Source & Metrics
            $table->enum('dispute_source', [
                'chargeback_visa_mc',
                'momo_fraud_claim',
                'client_portal_inquiry'
            ])->default('client_portal_inquiry');
            $table->decimal('disputed_amount', 15, 2);
            $table->string('currency', 3)->default('UGX');
            $table->text('reason');

            // Evidence & Timeline
            $table->timestamp('evidence_deadline')->nullable();
            $table->enum('status', [
                'opened',
                'evidence_submitted',
                'under_review',
                'won',
                'lost',
                'settled'
            ])->default('opened');
            $table->json('evidence_files')->nullable(); // [{"title": "Proof of milestone delivery", "file_path": "...", "submitted_at": "..."}]

            // Resolution
            $table->text('resolution_notes')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'created_at']);
            $table->index(['client_id', 'status']);
            $table->index('payment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_disputes');
        Schema::dropIfExists('payment_refunds');
    }
};
