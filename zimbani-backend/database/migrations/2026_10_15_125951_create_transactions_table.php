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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('transaction_number', 50)->unique();
            
            // Relational Foreign Keys
            $table->foreignId('account_id')->nullable()->constrained('savings_accounts')->onDelete('restrict');
            $table->foreignId('client_id')->constrained('clients')->onDelete('restrict');
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            $table->foreignId('related_transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            
            // Transaction Details
            $table->string('transaction_type', 50); // payment, adjustment, reversal, refund, transfer, withdrawal
            $table->decimal('amount', 15, 2); // Positive for credit, negative for debit
            $table->string('currency', 3)->default('UGX');
            
            // Balance Tracking
            $table->decimal('balance_before', 15, 2)->default(0.00);
            $table->decimal('balance_after', 15, 2)->default(0.00);
            
            // Description & References
            $table->string('description', 500);
            $table->text('narration')->nullable();
            $table->string('reference_number', 100)->nullable();
            
            // Dates
            $table->timestamp('transaction_date')->useCurrent();
            $table->date('value_date')->useCurrent();
            
            // Status & Reversal Tracking
            $table->string('status', 50)->default('posted'); // posted, reversed, pending, failed
            $table->timestamp('reversed_at')->nullable();
            $table->foreignId('reversed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reversal_reason')->nullable();
            
            // Audit
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes for fast ledger lookups & reconciliation queries
            $table->index(['account_id', 'transaction_date']);
            $table->index(['client_id', 'transaction_date']);
            $table->index('transaction_type');
            $table->index('status');
            $table->index('value_date');
            $table->index('reference_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
