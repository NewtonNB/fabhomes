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
        // 1. Subcontractor Contracts Table
        Schema::create('subcontractor_contracts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('contract_number', 50)->unique();
            $table->string('title', 255);
            $table->string('subcontractor_name', 255);
            $table->string('subcontractor_contact_person', 255)->nullable();
            $table->string('subcontractor_phone', 50);
            $table->string('subcontractor_email', 255)->nullable();
            $table->string('tax_identification_number', 100)->nullable();
            
            // Linkages
            $table->foreignId('project_id')->constrained('projects')->onDelete('restrict');
            $table->foreignId('site_id')->constrained('sites')->onDelete('restrict');
            
            // Trade & Scope
            $table->string('trade_category', 50); // masonry, electrical, plumbing, roofing, painting, steelwork, carpentry, tiling, landscaping, earthworks, other
            $table->text('scope_of_work');
            
            // Financial Terms
            $table->decimal('contract_sum', 15, 2);
            $table->string('currency', 3)->default('UGX');
            $table->decimal('retention_percentage', 5, 2)->default(5.00);
            $table->decimal('retention_amount', 15, 2)->default(0.00);
            
            // Schedule
            $table->date('start_date');
            $table->date('expected_completion_date');
            $table->date('actual_completion_date')->nullable();
            $table->text('payment_terms')->nullable();
            
            // Status & Approvals
            $table->string('status', 50)->default('draft'); // draft, active, suspended, completed, terminated
            $table->timestamp('signed_at')->nullable();
            $table->foreignId('signed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            
            // Notes & Audit
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('project_id');
            $table->index('site_id');
            $table->index('trade_category');
            $table->index('status');
            $table->index('start_date');
            $table->index('subcontractor_name');
        });

        // 2. Payment Certificates & Valuations Table
        Schema::create('payment_certificates', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('certificate_number', 50)->unique();
            
            // Linkages
            $table->foreignId('contract_id')->constrained('subcontractor_contracts')->onDelete('restrict');
            $table->foreignId('project_id')->constrained('projects')->onDelete('restrict');
            $table->foreignId('site_id')->constrained('sites')->onDelete('restrict');
            
            // Valuation Timing
            $table->date('valuation_period_start');
            $table->date('valuation_period_end');
            $table->date('valuation_date');
            $table->string('certificate_type', 50)->default('interim'); // interim, practical_completion, final, retention_release
            
            // Valuation Financials
            $table->decimal('gross_amount', 15, 2); // Cumulative gross value of work executed to date
            $table->decimal('previous_gross_amount', 15, 2)->default(0.00);
            $table->decimal('current_gross_amount', 15, 2)->default(0.00); // gross_amount - previous_gross_amount
            $table->decimal('materials_on_site_value', 15, 2)->default(0.00);
            
            // Deductions & Withholding
            $table->decimal('retention_rate', 5, 2)->default(5.00);
            $table->decimal('retention_deducted', 15, 2)->default(0.00);
            $table->decimal('withholding_tax_rate', 5, 2)->default(6.00);
            $table->decimal('withholding_tax_amount', 15, 2)->default(0.00);
            $table->decimal('other_deductions', 15, 2)->default(0.00);
            $table->decimal('net_certified_amount', 15, 2)->default(0.00);
            $table->string('currency', 3)->default('UGX');
            
            // Description & Measurements
            $table->string('description', 500);
            $table->text('measurement_sheet_summary')->nullable();
            
            // Status & Multi-Tier Approvals
            $table->string('status', 50)->default('draft'); // draft, submitted, verified_by_site_manager, approved_by_finance, authorized_by_admin, paid, rejected
            
            // 1. Site Manager Verification
            $table->foreignId('site_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('site_manager_signed_at')->nullable();
            $table->text('site_manager_notes')->nullable();
            
            // 2. Finance Officer Approval
            $table->foreignId('finance_officer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('finance_officer_approved_at')->nullable();
            $table->text('finance_officer_notes')->nullable();
            
            // 3. Admin Authorization
            $table->foreignId('admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('admin_authorized_at')->nullable();
            $table->text('admin_notes')->nullable();
            
            // 4. Payment Execution
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('paid_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('payment_reference', 100)->nullable();
            $table->text('rejection_reason')->nullable();
            
            // Audit
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('contract_id');
            $table->index('project_id');
            $table->index('site_id');
            $table->index('status');
            $table->index('valuation_date');
            $table->index('certificate_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_certificates');
        Schema::dropIfExists('subcontractor_contracts');
    }
};
