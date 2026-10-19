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
        // 1. Contract Milestones (Work Package Allocation)
        Schema::create('contract_milestones', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            
            $table->foreignId('contract_id')->constrained('subcontractor_contracts')->cascadeOnDelete();
            $table->foreignId('milestone_id')->constrained('construction_milestones')->cascadeOnDelete();
            
            $table->decimal('allocated_amount', 15, 2);
            $table->decimal('weight_percentage', 5, 2)->default(0.00);
            
            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable();
            
            $table->enum('status', [
                'pending',
                'in_progress',
                'under_review',
                'certified',
                'completed',
            ])->default('pending');
            
            $table->decimal('certified_amount', 15, 2)->default(0.00);
            $table->decimal('paid_amount', 15, 2)->default(0.00);
            
            $table->text('notes')->nullable();
            
            $table->softDeletes();
            $table->timestamps();

            $table->index('contract_id');
            $table->index('milestone_id');
            $table->index('status');
        });

        // 2. Link Payment Certificates directly to Milestones & Milestone Verifications
        Schema::table('payment_certificates', function (Blueprint $table) {
            $table->foreignId('milestone_id')->nullable()->after('site_id')->constrained('construction_milestones')->nullOnDelete();
            $table->foreignId('milestone_verification_id')->nullable()->after('milestone_id')->constrained('milestone_verifications')->nullOnDelete();
            $table->decimal('physical_completion_percentage', 5, 2)->nullable()->after('milestone_verification_id');
            $table->string('boq_compliance_status', 50)->nullable()->after('physical_completion_percentage');
            $table->string('qs_valuation_reference', 100)->nullable()->after('boq_compliance_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_certificates', function (Blueprint $table) {
            $table->dropForeign(['milestone_verification_id']);
            $table->dropForeign(['milestone_id']);
            $table->dropColumn([
                'milestone_id',
                'milestone_verification_id',
                'physical_completion_percentage',
                'boq_compliance_status',
                'qs_valuation_reference',
            ]);
        });

        Schema::dropIfExists('contract_milestones');
    }
};
