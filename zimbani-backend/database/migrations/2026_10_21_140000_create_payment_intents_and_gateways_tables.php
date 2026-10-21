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
        // 1. Payment Gateways Dynamic Configuration Table
        Schema::create('payment_gateway_configs', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('name', 50)->unique(); // flutterwave, pesapal, mtn_momo, airtel_money, stanbic_bank
            $table->string('display_name', 100);
            $table->string('provider_type', 50); // aggregator, telco, bank
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->enum('environment', ['sandbox', 'production'])->default('sandbox');
            $table->text('public_key')->nullable();
            $table->text('secret_key')->nullable();
            $table->text('encryption_key')->nullable();
            $table->string('webhook_secret', 255)->nullable();
            $table->string('merchant_id', 100)->nullable();
            $table->string('api_endpoint', 255)->nullable();
            $table->json('supported_currencies')->nullable(); // ["UGX", "USD", "GBP", "EUR", "KES"]
            $table->json('supported_methods')->nullable(); // ["mobile_money", "card", "bank_transfer"]
            $table->decimal('transaction_fee_percentage', 5, 2)->default(2.50);
            $table->decimal('flat_fee', 10, 2)->default(0.00);
            $table->decimal('min_transaction_amount', 12, 2)->default(500.00);
            $table->decimal('max_transaction_amount', 15, 2)->default(100000000.00);
            $table->unsignedInteger('display_order')->default(1);
            $table->text('instructions')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Dynamic Payment Intents Table (Lifecycle & Multi-Channel State Machine)
        Schema::create('payment_intents', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('intent_reference', 60)->unique(); // INT-YYYYMM-XXXX
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('company_id')->nullable()->constrained('companies')->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->foreignId('savings_account_id')->nullable()->constrained('savings_accounts')->nullOnDelete();
            $table->foreignId('milestone_savings_pool_id')->nullable()->constrained('milestone_savings_pools')->nullOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();

            $table->string('gateway_name', 50); // flutterwave, pesapal, mtn_momo, etc.
            $table->string('payment_method', 50)->default('mobile_money'); // mobile_money, card, bank_transfer
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('UGX');
            $table->decimal('fee_amount', 12, 2)->default(0.00);
            $table->decimal('total_charge_amount', 15, 2);

            $table->string('client_phone', 30)->nullable();
            $table->string('client_email', 150)->nullable();
            $table->string('client_name', 150)->nullable();

            $table->enum('status', [
                'requires_payment_method',
                'requires_action',
                'processing',
                'succeeded',
                'failed',
                'cancelled',
                'expired',
            ])->default('requires_payment_method');

            $table->string('gateway_reference', 150)->nullable();
            $table->text('gateway_checkout_url')->nullable();
            $table->json('gateway_response')->nullable();
            $table->text('failure_reason')->nullable();

            $table->timestamp('expires_at')->nullable();
            $table->timestamp('succeeded_at')->nullable();
            $table->timestamp('failed_at')->nullable();

            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['client_id', 'status'], 'idx_pi_client_status');
            $table->index(['intent_reference'], 'idx_pi_reference');
            $table->index(['gateway_reference'], 'idx_pi_gw_ref');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_intents');
        Schema::dropIfExists('payment_gateway_configs');
    }
};
