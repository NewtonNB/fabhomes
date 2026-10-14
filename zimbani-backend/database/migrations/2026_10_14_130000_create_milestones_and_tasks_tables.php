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
        // 1. Add completion_percentage to projects table if not already present
        if (!Schema::hasColumn('projects', 'completion_percentage')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->decimal('completion_percentage', 5, 2)->default(0.00)->after('status');
            });
        }

        // 2. Create construction_milestones table
        Schema::create('construction_milestones', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            
            // Milestone Details
            $table->string('milestone_name'); // Foundation, Superstructure, Roofing, Finishing, Handover
            $table->integer('milestone_order'); // Sequence order
            $table->text('description')->nullable();
            
            // Timeline
            $table->date('planned_start_date')->nullable();
            $table->date('planned_end_date')->nullable();
            $table->date('actual_start_date')->nullable();
            $table->date('actual_end_date')->nullable();
            
            // Budget
            $table->decimal('estimated_cost', 15, 2)->nullable();
            $table->decimal('actual_cost', 15, 2)->nullable();
            $table->string('currency', 3)->default('UGX');
            
            // Status & Progress
            $table->enum('status', ['pending', 'in_progress', 'completed', 'skipped'])->default('pending');
            $table->decimal('completion_percentage', 5, 2)->default(0.00);
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            
            // Notes & Metadata
            $table->text('notes')->nullable();
            $table->text('completion_notes')->nullable();
            $table->json('metadata')->nullable();
            
            // Audit
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes & Unique constraints
            $table->unique(['project_id', 'milestone_order'], 'idx_proj_milestone_order');
            $table->index('uuid');
            $table->index('project_id');
            $table->index('status');
            $table->index(['planned_start_date', 'planned_end_date'], 'idx_cm_dates');
        });

        // 3. Create tasks table
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('task_number', 50)->unique(); // TSK-YYYYMMDD-XXXX
            $table->string('title');
            $table->text('description')->nullable();
            
            // Hierarchy Relationships
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->foreignId('milestone_id')->nullable()->constrained('construction_milestones')->nullOnDelete();
            
            // Assignment & Ownership
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            
            // Priority & Status
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'])->default('pending');
            $table->decimal('completion_percentage', 5, 2)->default(0.00);
            
            // Timeline & Hours
            $table->date('start_date')->nullable();
            $table->date('due_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->decimal('estimated_hours', 8, 2)->nullable();
            $table->decimal('actual_hours', 8, 2)->nullable();
            
            // Notes & Metadata
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('uuid');
            $table->index('task_number');
            $table->index('project_id');
            $table->index('site_id');
            $table->index('unit_id');
            $table->index('milestone_id');
            $table->index('assigned_to');
            $table->index('status');
            $table->index('priority');
            $table->index('due_date');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('construction_milestones');
        
        if (Schema::hasColumn('projects', 'completion_percentage')) {
            Schema::table('projects', function (Blueprint $table) {
                $table->dropColumn('completion_percentage');
            });
        }
    }
};
