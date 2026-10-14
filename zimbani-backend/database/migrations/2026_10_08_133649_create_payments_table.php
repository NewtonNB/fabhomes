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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            
            // Payment identifiers
            $table->string('payment_number')->unique()->comment('Auto-generated: PAY-YYYYMMDD-XXXX');
            $table->string('reference_number')->nullable()->comment('External reference (bank ref, receipt)');
            
            // Relationships
            $table->foreignId('unit_id')->constrained('units')->onDelete('restrict');
            $table->foreignId('client_id')->constrained('clients')->onDelete('restrict');
            $table->foreignId('processed_by')->nullable()->constrained('users')->onDelete('set null');
            
            // Payment classification
            $table->enum('payment_type', [
                'deposit',
                'installment', 
                'full_payment',
                'balance',
                'booking_fee',
                'penalty',
                'refund'
            ])->default('installment');
            
            $table->enum('payment_method', [
                'cash',
                'bank_transfer',
                'check',
                'mobile_money',
                'card',
                'other'
            ])->default('bank_transfer');
            
            $table->enum('status', [
                'pending',
                'confirmed',
                'verified',
                'rejected',
                'refunded',
                'cancelled'
            ])->default('pending');
            
            // Financial information
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('UGX');
            $table->decimal('penalty_amount', 15, 2)->nullable()->default(0);
            $table->decimal('discount_amount', 15, 2)->nullable()->default(0);
            $table->decimal('total_amount', 15, 2)->comment('amount + penalty - discount');
            
            // Payment details
            $table->date('payment_date');
            $table->date('due_date')->nullable();
            $table->date('confirmed_at_date')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->onDelete('set null');
            
            // Bank/Transaction details
            $table->string('bank_name')->nullable();
            $table->string('bank_account')->nullable();
            $table->string('transaction_id')->nullable();
            $table->string('check_number')->nullable();
            $table->string('mobile_money_number')->nullable();
            
            // Additional information
            $table->text('notes')->nullable();
            $table->string('receipt_path')->nullable()->comment('Path to uploaded receipt/proof');
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('payment_number');
            $table->index('reference_number');
            $table->index('unit_id');
            $table->index('client_id');
            $table->index('payment_type');
            $table->index('payment_method');
            $table->index('status');
            $table->index('payment_date');
            $table->index('due_date');
            $table->index(['payment_date', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
