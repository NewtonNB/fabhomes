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
        // 1. Materials Catalog & Site Inventory Table
        Schema::create('materials', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('material_code', 50)->unique(); // e.g. MAT-20261015-0001
            $table->string('name');
            $table->enum('category', [
                'cement',
                'steel_rebar',
                'aggregates_sand',
                'masonry_blocks',
                'timber_formwork',
                'roofing',
                'plumbing_electrical',
                'finishes_paint',
                'safety_tools',
                'other'
            ])->default('other');
            
            $table->string('unit_of_measure', 50); // bags, tonnes, trips, pieces, meters, etc.
            $table->decimal('unit_cost', 15, 2)->default(0.00);
            $table->string('currency', 3)->default('UGX');
            
            // Site inventory tracking (nullable for centralized catalog)
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->decimal('current_stock', 12, 2)->default(0.00);
            $table->decimal('minimum_stock_level', 12, 2)->default(0.00); // Alert threshold
            $table->decimal('reorder_quantity', 12, 2)->default(0.00);
            $table->string('storage_location')->nullable(); // e.g. Bay 2, Warehouse Store
            
            // Supplier info & Details
            $table->string('supplier_name')->nullable();
            $table->string('supplier_contact')->nullable();
            $table->text('description')->nullable();
            
            // Status
            $table->enum('status', [
                'in_stock',
                'low_stock',
                'out_of_stock',
                'discontinued'
            ])->default('in_stock');
            
            $table->json('metadata')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('uuid');
            $table->index('material_code');
            $table->index('category');
            $table->index('site_id');
            $table->index('status');
        });

        // 2. Material Requisitions Table
        Schema::create('material_requisitions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('requisition_number', 50)->unique(); // REQ-YYYYMMDD-XXXX
            
            $table->foreignId('site_id')->constrained('sites')->onDelete('cascade');
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('requested_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            
            $table->enum('status', [
                'pending',
                'approved',
                'rejected',
                'ordered',
                'delivered',
                'cancelled'
            ])->default('pending');
            
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->date('required_by_date')->nullable();
            $table->decimal('total_estimated_cost', 15, 2)->default(0.00);
            $table->string('currency', 3)->default('UGX');
            
            $table->json('items'); // [{ material_id, material_name, quantity, unit, estimated_unit_cost, total_cost, notes }]
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamp('delivered_at')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('uuid');
            $table->index('requisition_number');
            $table->index('site_id');
            $table->index('project_id');
            $table->index('requested_by');
            $table->index('status');
            $table->index('priority');
            $table->index('created_at');
        });

        // 3. Material Usages / Consumption Logs Table
        Schema::create('material_usages', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('usage_number', 50)->unique(); // USG-YYYYMMDD-XXXX
            
            $table->foreignId('material_id')->constrained('materials')->onDelete('cascade');
            $table->foreignId('site_id')->constrained('sites')->onDelete('cascade');
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->foreignId('milestone_id')->nullable()->constrained('construction_milestones')->nullOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            
            $table->decimal('quantity_used', 12, 2);
            $table->string('unit_of_measure', 50);
            $table->decimal('unit_cost_at_usage', 15, 2)->nullable();
            $table->decimal('total_cost', 15, 2)->nullable();
            
            $table->date('used_date');
            $table->foreignId('logged_by')->constrained('users')->onDelete('cascade');
            $table->string('purpose'); // e.g. "Slab concrete pour", "Bricklaying perimeter wall"
            $table->text('notes')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('uuid');
            $table->index('usage_number');
            $table->index('material_id');
            $table->index('site_id');
            $table->index('project_id');
            $table->index('task_id');
            $table->index('milestone_id');
            $table->index('unit_id');
            $table->index('used_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('material_usages');
        Schema::dropIfExists('material_requisitions');
        Schema::dropIfExists('materials');
    }
};
