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
        // 1. Site Inspections & Quality Audits
        Schema::create('site_inspections', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('inspection_number', 50)->unique();
            $table->string('title', 255);
            $table->enum('inspection_type', [
                'foundation',
                'structural_framing',
                'masonry',
                'plumbing_rough_in',
                'electrical_rough_in',
                'concrete_pre_pour',
                'waterproofing',
                'finishing',
                'handover_audit',
                'safety_environmental',
                'other',
            ])->default('other');

            // Relational linkages
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->foreignId('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->foreignId('milestone_id')->nullable()->constrained('construction_milestones')->nullOnDelete();
            
            // Personnel & Schedule
            $table->foreignId('inspector_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('scheduled_date');
            $table->dateTime('inspected_at')->nullable();
            
            // Status & Scoring
            $table->enum('status', [
                'scheduled',
                'in_progress',
                'passed',
                'failed',
                'passed_with_conditions',
                'cancelled',
            ])->default('scheduled');
            $table->decimal('score', 5, 2)->nullable(); // e.g. 95.50%
            
            // Checklist & Observations
            $table->json('checklist_items')->nullable();
            $table->text('summary_notes')->nullable();
            $table->text('conditions')->nullable();
            
            // Supervisor Formal Sign-off
            $table->foreignId('supervisor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('signed_off_at')->nullable();
            $table->text('sign_off_notes')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            // Indexes
            $table->index('site_id');
            $table->index('project_id');
            $table->index('unit_id');
            $table->index('status');
            $table->index('inspection_type');
            $table->index('scheduled_date');
        });

        // 2. Punch List & Defect Management Items
        Schema::create('punch_list_items', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('item_number', 50)->unique();
            
            // Associated inspection (optional if logged ad-hoc during walk-through)
            $table->foreignId('site_inspection_id')->nullable()->constrained('site_inspections')->nullOnDelete();
            
            // Relational linkages
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->foreignId('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            
            // Defect details
            $table->string('title', 255);
            $table->text('description');
            $table->string('location_details', 255)->nullable(); // e.g., "Block B, 2nd floor, Master bedroom ceiling"
            
            $table->enum('category', [
                'structural',
                'architectural',
                'plumbing',
                'electrical',
                'finishing',
                'safety',
                'other',
            ])->default('finishing');

            $table->enum('severity', [
                'low',
                'medium',
                'high',
                'critical',
            ])->default('medium');

            $table->enum('status', [
                'open',
                'in_progress',
                'rectified',
                'verified_closed',
                'waived',
            ])->default('open');

            // Resolution workflow
            $table->date('due_date')->nullable();
            $table->dateTime('rectified_at')->nullable();
            $table->text('rectification_notes')->nullable();
            
            // Assignment
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('subcontractor_name', 255)->nullable();
            
            // Audit & Verification
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('verified_at')->nullable();
            $table->text('verification_notes')->nullable();
            
            $table->softDeletes();
            $table->timestamps();

            // Indexes
            $table->index('site_id');
            $table->index('site_inspection_id');
            $table->index('status');
            $table->index('severity');
            $table->index('category');
            $table->index('due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('punch_list_items');
        Schema::dropIfExists('site_inspections');
    }
};
