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
        // 1. Create mobile_money_gateways table
        Schema::create('mobile_money_gateways', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->enum('provider', ['mtn_momo', 'airtel_money', 'mock_gateway', 'flutterwave'])->default('mtn_momo');
            $table->string('account_name', 100);
            $table->string('merchant_code', 50)->nullable();
            $table->string('api_user', 100)->nullable();
            $table->text('api_key_encrypted')->nullable();
            $table->enum('environment', ['sandbox', 'production'])->default('sandbox');
            $table->boolean('is_active')->default(true);
            $table->char('currency', 3)->default('UGX');
            $table->decimal('daily_disbursement_limit', 15, 2)->default(50000000.00); // 50m UGX daily default
            $table->decimal('current_daily_disbursed', 15, 2)->default(0.00);
            $table->string('webhook_secret', 255)->nullable();
            $table->timestamps();
        });

        // 2. Create mobile_money_transactions table
        Schema::create('mobile_money_transactions', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('transaction_reference', 50)->unique(); // MM-202610-0001
            $table->string('external_reference', 100)->nullable(); // Gateway reference ID / financialTransactionId
            $table->enum('provider', ['mtn_momo', 'airtel_money', 'mock_gateway', 'flutterwave'])->default('mtn_momo');
            $table->enum('transaction_type', ['c2b_collection', 'b2c_disbursement'])->default('c2b_collection');
            $table->string('phone_number', 20); // 256772123456
            $table->string('payer_or_payee_name', 255)->nullable();

            $table->decimal('amount', 15, 2);
            $table->decimal('fee_amount', 15, 2)->default(0.00);
            $table->decimal('net_amount', 15, 2);
            $table->char('currency', 3)->default('UGX');

            $table->enum('status', [
                'pending',
                'processing',
                'successful',
                'failed',
                'reversed',
            ])->default('pending');

            $table->text('failure_reason')->nullable();
            $table->enum('purpose', [
                'savings_deposit',
                'contractor_payout',
                'petty_cash_topup',
                'casual_wages',
                'client_refund',
                'retention_release',
            ])->default('savings_deposit');

            // Entity associations
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('savings_account_id')->nullable()->constrained('savings_accounts')->nullOnDelete();
            $table->foreignId('milestone_savings_pool_id')->nullable()->constrained('milestone_savings_pools')->nullOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->foreignId('payment_certificate_id')->nullable()->constrained('payment_certificates')->nullOnDelete();
            $table->foreignId('milestone_payment_release_id')->nullable()->constrained('milestone_payment_releases')->nullOnDelete();
            $table->foreignId('petty_cash_account_id')->nullable()->constrained('petty_cash_accounts')->nullOnDelete();
            $table->foreignId('ledger_transaction_id')->nullable()->constrained('transactions')->nullOnDelete();

            // Authorization & Audit
            $table->foreignId('initiated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('authorized_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('initiated_at');
            $table->timestamp('completed_at')->nullable();

            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->json('callback_payload')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['transaction_reference', 'status'], 'idx_mm_ref_status');
            $table->index(['phone_number', 'created_at'], 'idx_mm_phone_date');
            $table->index(['transaction_type', 'status'], 'idx_mm_type_status');
            $table->index(['savings_account_id', 'status'], 'idx_mm_account_status');
        });

        // 3. Create payment_webhook_logs table
        Schema::create('payment_webhook_logs', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('provider', 50);
            $table->string('event_type', 100)->nullable();
            $table->string('external_reference', 100)->nullable();
            $table->json('headers')->nullable();
            $table->json('payload');
            $table->string('ip_address', 45)->nullable();

            $table->enum('status', ['received', 'processed', 'failed', 'ignored'])->default('received');
            $table->text('processing_error')->nullable();
            $table->foreignId('mobile_money_transaction_id')
                ->nullable()
                ->constrained('mobile_money_transactions')
                ->nullOnDelete();

            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['provider', 'external_reference'], 'idx_pwl_prov_ext');
            $table->index(['status', 'created_at'], 'idx_pwl_status_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_webhook_logs');
        Schema::dropIfExists('mobile_money_transactions');
        Schema::dropIfExists('mobile_money_gateways');
    }
};
