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
        // 1. Retention Funds Ledger Table
        Schema::create('retention_funds', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('fund_number', 50)->unique();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->foreignId('contract_id')->nullable()->constrained('subcontractor_contracts')->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->enum('beneficiary_type', ['subcontractor', 'developer', 'client'])->default('subcontractor');
            $table->string('beneficiary_name', 150);
            $table->enum('fund_type', ['contractor_retention', 'client_defect_reserve'])->default('contractor_retention');
            $table->decimal('total_withheld_amount', 15, 2)->default(0.00);
            $table->decimal('total_deductions_amount', 15, 2)->default(0.00);
            $table->decimal('total_released_amount', 15, 2)->default(0.00);
            $table->decimal('current_balance', 15, 2)->default(0.00);
            $table->string('currency', 3)->default('USD');
            $table->decimal('retention_rate', 5, 2)->default(5.00); // Standard 5%
            $table->enum('status', [
                'accumulating',
                'holding',
                'partially_released',
                'fully_released',
                'forfeited',
            ])->default('accumulating');
            $table->date('practical_completion_date')->nullable();
            $table->date('dlp_commenced_at')->nullable();
            $table->date('dlp_expiry_date')->nullable();
            $table->unsignedInteger('dlp_period_days')->default(180); // 180 days (6 months) standard FIDIC
            $table->boolean('eligible_for_release')->default(false);
            $table->timestamp('cleared_for_release_at')->nullable();
            $table->foreignId('cleared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'status'], 'idx_rf_proj_status');
            $table->index(['contract_id'], 'idx_rf_contract');
        });

        // 2. Defect Liability & Practical Completion Certificates Table
        Schema::create('defect_liability_certificates', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('certificate_number', 50)->unique();
            $table->enum('certificate_type', [
                'practical_completion',
                'defect_clearance',
                'final_handover',
                'retention_release',
            ]);
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->foreignId('contract_id')->nullable()->constrained('subcontractor_contracts')->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('retention_fund_id')->nullable()->constrained('retention_funds')->nullOnDelete();
            $table->date('commencement_date')->nullable();
            $table->date('maturity_date')->nullable();
            $table->decimal('retention_pool_amount', 15, 2)->default(0.00);
            $table->decimal('deductions_amount', 15, 2)->default(0.00);
            $table->decimal('net_release_amount', 15, 2)->default(0.00);
            $table->string('currency', 3)->default('USD');
            $table->unsignedInteger('open_snags_count')->default(0);
            $table->unsignedInteger('resolved_snags_count')->default(0);
            $table->foreignId('qs_signed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('qs_signed_at')->nullable();
            $table->foreignId('engineer_signed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('engineer_signed_at')->nullable();
            $table->timestamp('client_signed_at')->nullable();
            $table->enum('status', [
                'draft',
                'pending_inspection',
                'approved',
                'issued',
                'rejected',
            ])->default('draft');
            $table->text('inspection_notes')->nullable();
            $table->text('certificate_notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'certificate_type'], 'idx_dlc_proj_type');
        });

        // 3. Retention Fund Transactions (Audit Ledger)
        Schema::create('retention_transactions', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->foreignId('retention_fund_id')->constrained('retention_funds')->cascadeOnDelete();
            $table->foreignId('defect_liability_certificate_id')->nullable()->constrained('defect_liability_certificates')->nullOnDelete();
            $table->foreignId('payment_certificate_id')->nullable()->constrained('payment_certificates')->nullOnDelete();
            $table->foreignId('milestone_payment_release_id')->nullable()->constrained('milestone_payment_releases')->nullOnDelete();
            $table->foreignId('ledger_transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->enum('transaction_type', [
                'withholding',
                'rectification_deduction',
                'interim_release',
                'final_release',
            ]);
            $table->decimal('amount', 15, 2);
            $table->decimal('balance_before', 15, 2);
            $table->decimal('balance_after', 15, 2);
            $table->string('reference_number', 100)->nullable();
            $table->string('description', 255)->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['retention_fund_id', 'transaction_type'], 'idx_rt_fund_type');
        });

        // 4. Alter punch_list_items to link to DLP certificates
        if (Schema::hasTable('punch_list_items')) {
            Schema::table('punch_list_items', function (Blueprint $table) {
                if (!Schema::hasColumn('punch_list_items', 'defect_liability_certificate_id')) {
                    $table->foreignId('defect_liability_certificate_id')
                        ->nullable()
                        ->after('task_id')
                        ->constrained('defect_liability_certificates')
                        ->nullOnDelete();
                }
                if (!Schema::hasColumn('punch_list_items', 'is_dlp_defect')) {
                    $table->boolean('is_dlp_defect')
                        ->default(false)
                        ->after('defect_liability_certificate_id');
                }
            });
        }

        // 5. Alter payment_certificates to track retention release
        if (Schema::hasTable('payment_certificates')) {
            Schema::table('payment_certificates', function (Blueprint $table) {
                if (!Schema::hasColumn('payment_certificates', 'retention_released_at')) {
                    $table->timestamp('retention_released_at')
                        ->nullable()
                        ->after('retention_deducted');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('payment_certificates')) {
            Schema::table('payment_certificates', function (Blueprint $table) {
                if (Schema::hasColumn('payment_certificates', 'retention_released_at')) {
                    $table->dropColumn('retention_released_at');
                }
            });
        }

        if (Schema::hasTable('punch_list_items')) {
            Schema::table('punch_list_items', function (Blueprint $table) {
                if (Schema::hasColumn('punch_list_items', 'defect_liability_certificate_id')) {
                    $table->dropForeign(['defect_liability_certificate_id']);
                    $table->dropColumn('defect_liability_certificate_id');
                }
                if (Schema::hasColumn('punch_list_items', 'is_dlp_defect')) {
                    $table->dropColumn('is_dlp_defect');
                }
            });
        }

        Schema::dropIfExists('retention_transactions');
        Schema::dropIfExists('defect_liability_certificates');
        Schema::dropIfExists('retention_funds');
    }
};
