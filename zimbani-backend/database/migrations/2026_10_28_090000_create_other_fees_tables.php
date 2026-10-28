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
        // 1. Fee Categories / Registry Table
        if (!Schema::hasTable('other_fee_categories')) {
            Schema::create('other_fee_categories', function (Blueprint $table) {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->string('code', 50)->unique();
                $table->string('name', 150);
                $table->text('description')->nullable();
                $table->decimal('standard_amount', 15, 2)->default(0.00);
                $table->boolean('is_mandatory')->default(false);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // 2. Other Fees Operational Table (Legacy Manual Section 2.2 Panel 5: OtherFeesMgt.java)
        if (!Schema::hasTable('other_fees')) {
            Schema::create('other_fees', function (Blueprint $table) {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->string('fee_number', 50)->unique(); // e.g. FEE-2026-0001
                $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
                
                $table->string('category_code', 50);
                $table->string('category_name', 150);
                
                $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
                $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
                $table->foreignId('savings_account_id')->nullable()->constrained('savings_accounts')->nullOnDelete();
                
                $table->string('title', 200);
                $table->text('description')->nullable();
                
                $table->decimal('amount', 15, 2);
                $table->decimal('amount_paid', 15, 2)->default(0.00);
                $table->decimal('balance_due', 15, 2)->default(0.00);
                
                $table->enum('status', ['pending', 'partial', 'paid', 'waived', 'cancelled'])->default('pending');
                $table->date('due_date')->nullable();
                $table->timestamp('paid_at')->nullable();
                
                $table->string('payment_method', 50)->nullable(); // cash, mtn_momo, airtel_money, bank_transfer, cheque
                $table->string('payment_reference', 100)->nullable();
                $table->string('receipt_number', 50)->nullable()->unique(); // e.g. RCP-FEE-2026-0001
                
                $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                
                $table->text('waiver_reason')->nullable();
                $table->text('notes')->nullable();
                $table->json('metadata')->nullable();

                $table->timestamps();
                $table->softDeletes();

                $table->index(['client_id', 'status']);
                $table->index('category_code');
                $table->index('fee_number');
                $table->index('receipt_number');
                $table->index('due_date');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('other_fees');
        Schema::dropIfExists('other_fee_categories');
    }
};
