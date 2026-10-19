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
        // 1. Create milestone_verifications table
        Schema::create('milestone_verifications', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('verification_number', 50)->unique(); // MV-YYYYMMDD-XXXX
            
            // Core Relationships
            $table->foreignId('milestone_id')->constrained('construction_milestones')->onDelete('cascade');
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            
            // Scope & Physical Assessment
            $table->string('title', 255);
            $table->enum('stage', [
                'draft',
                'submitted',
                'engineer_verified',
                'qs_verified',
                'client_approved',
                'rejected',
            ])->default('draft');
            
            $table->decimal('physical_completion_percentage', 5, 2)->default(0.00);
            $table->enum('work_quality_rating', [
                'exceptional',
                'satisfactory',
                'defects_noted',
                'rejected',
            ])->default('satisfactory');
            $table->date('inspection_date')->nullable();
            $table->text('inspection_notes')->nullable();
            
            // 1. Site Engineer Sign-Off
            $table->foreignId('site_engineer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('engineer_signed_at')->nullable();
            $table->boolean('structural_checks_passed')->default(false);
            $table->text('engineer_notes')->nullable();
            
            // 2. Quantity Surveyor (QS) Sign-Off
            $table->foreignId('quantity_surveyor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('qs_signed_at')->nullable();
            $table->decimal('qs_certified_amount', 15, 2)->default(0.00);
            $table->enum('boq_compliance_status', [
                'fully_compliant',
                'minor_variations',
                'non_compliant',
            ])->default('fully_compliant');
            $table->text('qs_notes')->nullable();
            
            // 3. Client Sign-Off / Approval
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('client_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('client_signed_at')->nullable();
            $table->enum('client_approval_status', [
                'pending',
                'approved',
                'disputed',
                'waived_by_admin',
            ])->default('pending');
            $table->text('client_feedback')->nullable();
            
            // Rejection / Audit
            $table->text('rejection_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index(['milestone_id', 'stage']);
            $table->index('project_id');
            $table->index('unit_id');
            $table->index('stage');
            $table->index('inspection_date');
        });

        // 2. Create milestone_payment_releases table
        Schema::create('milestone_payment_releases', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('release_number', 50)->unique(); // MPR-YYYYMMDD-XXXX
            
            // Core Relationships
            $table->foreignId('milestone_verification_id')->constrained('milestone_verifications')->onDelete('cascade');
            $table->foreignId('milestone_id')->constrained('construction_milestones')->onDelete('cascade');
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('savings_account_id')->nullable()->constrained('savings_accounts')->nullOnDelete();
            
            // Commercial & Financial Terms
            $table->enum('source_type', [
                'savings_escrow',
                'unit_installment',
                'project_operations',
            ])->default('savings_escrow');
            
            $table->decimal('gross_amount', 15, 2);
            $table->decimal('retention_percentage', 5, 2)->default(5.00); // 5% defect liability retention
            $table->decimal('retention_amount', 15, 2)->default(0.00);
            $table->decimal('net_release_amount', 15, 2);
            $table->string('currency', 3)->default('UGX');
            
            // Lifecycle Status
            $table->enum('status', [
                'pending_authorization',
                'authorized',
                'disbursed',
                'rejected',
                'reversed',
            ])->default('pending_authorization');
            
            // Multi-Tier Financial Sign-Off
            $table->foreignId('authorized_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('authorized_at')->nullable();
            $table->text('authorization_notes')->nullable();
            
            // Disbursement Details
            $table->foreignId('disbursed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('disbursed_at')->nullable();
            $table->enum('payment_method', [
                'internal_transfer',
                'bank_transfer',
                'mobile_money',
                'cheque',
            ])->default('internal_transfer');
            $table->string('disbursement_reference', 100)->nullable();
            
            // Ledger & Payment Links
            $table->foreignId('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained('payments')->nullOnDelete();
            
            // Defect Liability Period & Retention Release
            $table->timestamp('retention_released_at')->nullable();
            $table->foreignId('retention_released_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('retention_transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->text('retention_notes')->nullable();
            
            // Audit & Notes
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('project_id');
            $table->index('milestone_id');
            $table->index('unit_id');
            $table->index('status');
            $table->index('disbursed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('milestone_payment_releases');
        Schema::dropIfExists('milestone_verifications');
    }
};
