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
        Schema::create('project_budgets', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            
            // Cost Code & Classification
            $table->string('budget_code', 50); // e.g. CC-SUBSTRUCTURE, CC-CONCRETE, CC-ROOFING
            $table->string('name', 150); // e.g. Substructure & Earthworks, Reinforced Concrete Works
            $table->enum('cost_category', [
                'subcontractor',
                'materials',
                'equipment',
                'labour',
                'direct_purchasing',
                'permits_legal',
                'contingency',
                'other',
            ])->default('subcontractor');

            // Financial allocation
            $table->decimal('allocated_amount', 15, 2)->default(0.00);
            $table->string('currency', 3)->default('UGX');
            $table->text('notes')->nullable();
            
            // Audit tracking
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['project_id', 'cost_category']);
            $table->index(['project_id', 'budget_code']);
            $table->unique(['project_id', 'budget_code', 'deleted_at'], 'project_budget_unique_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_budgets');
    }
};
