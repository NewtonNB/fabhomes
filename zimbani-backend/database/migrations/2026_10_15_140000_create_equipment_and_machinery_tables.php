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
        // 1. Equipment & Machinery Registry
        Schema::create('equipment', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('equipment_code', 50)->unique();
            $table->string('name', 255);
            $table->enum('type', [
                'earthmoving',
                'lifting',
                'concrete',
                'transport',
                'power_tools',
                'generators',
                'compaction',
                'other',
            ])->default('other');
            $table->string('model_number', 100)->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->string('registration_number', 50)->nullable();
            $table->enum('ownership_type', ['owned', 'rented', 'leased'])->default('owned');
            $table->decimal('hourly_rate', 12, 2)->nullable();
            $table->decimal('daily_rate', 12, 2)->nullable();
            $table->string('currency', 3)->default('UGX');
            
            // Site and Operator assignment
            $table->foreignId('current_site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->foreignId('assigned_operator_id')->nullable()->constrained('users')->nullOnDelete();
            
            // Status and Condition
            $table->enum('status', [
                'available',
                'dispatched',
                'in_use',
                'under_maintenance',
                'decommissioned',
            ])->default('available');
            $table->enum('condition', ['excellent', 'good', 'fair', 'needs_repair'])->default('good');
            $table->decimal('total_hours_operated', 10, 2)->default(0.00);
            
            // Maintenance and Financial Details
            $table->date('last_service_date')->nullable();
            $table->date('next_service_due_date')->nullable();
            $table->date('purchase_date')->nullable();
            $table->decimal('purchase_price', 15, 2)->nullable();
            $table->string('supplier_or_vendor', 255)->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->softDeletes();
            $table->timestamps();

            // Indexes
            $table->index('status');
            $table->index('type');
            $table->index('current_site_id');
            $table->index('assigned_operator_id');
            $table->index('condition');
        });

        // 2. Equipment Dispatches (Machinery movement & site assignment)
        Schema::create('equipment_dispatches', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('dispatch_number', 50)->unique();
            $table->foreignId('equipment_id')->constrained('equipment')->cascadeOnDelete();
            $table->foreignId('from_site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->foreignId('to_site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('operator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('dispatched_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->dateTime('dispatched_at');
            $table->date('expected_return_date')->nullable();
            $table->date('actual_return_date')->nullable();
            $table->enum('status', [
                'pending',
                'in_transit',
                'active_on_site',
                'returned',
                'cancelled',
            ])->default('pending');
            $table->string('purpose', 255);
            $table->decimal('transport_cost', 12, 2)->nullable();
            $table->text('notes')->nullable();
            
            $table->softDeletes();
            $table->timestamps();

            $table->index('equipment_id');
            $table->index('to_site_id');
            $table->index('status');
        });

        // 3. Equipment Maintenance & Service Logs
        Schema::create('equipment_maintenance_logs', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('maintenance_number', 50)->unique();
            $table->foreignId('equipment_id')->constrained('equipment')->cascadeOnDelete();
            $table->enum('maintenance_type', [
                'routine_service',
                'preventative',
                'breakdown_repair',
                'safety_inspection',
                'oil_change',
                'tire_replacement',
            ])->default('routine_service');
            $table->enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled'])->default('scheduled');
            $table->date('scheduled_date');
            $table->date('completed_date')->nullable();
            $table->decimal('hours_at_maintenance', 10, 2)->nullable();
            $table->decimal('cost', 12, 2)->default(0.00);
            $table->string('currency', 3)->default('UGX');
            $table->string('service_provider', 255)->nullable();
            $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('description');
            $table->text('parts_replaced')->nullable();
            $table->date('next_service_due_date')->nullable();
            $table->text('notes')->nullable();
            
            $table->softDeletes();
            $table->timestamps();

            $table->index('equipment_id');
            $table->index('status');
            $table->index('scheduled_date');
        });

        // 4. Equipment Utilization & Operating Hours Logs
        Schema::create('equipment_utilization_logs', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('log_number', 50)->unique();
            $table->foreignId('equipment_id')->constrained('equipment')->cascadeOnDelete();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->foreignId('operator_id')->nullable()->constrained('users')->nullOnDelete();
            
            $table->date('date');
            $table->decimal('start_meter_reading', 10, 2)->nullable();
            $table->decimal('end_meter_reading', 10, 2)->nullable();
            $table->decimal('hours_operated', 6, 2);
            $table->decimal('hourly_rate', 12, 2)->nullable();
            $table->decimal('fuel_litres_used', 8, 2)->nullable();
            $table->decimal('total_cost', 12, 2)->nullable();
            $table->string('purpose', 255);
            $table->foreignId('logged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            
            $table->softDeletes();
            $table->timestamps();

            $table->index('equipment_id');
            $table->index('site_id');
            $table->index('date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment_utilization_logs');
        Schema::dropIfExists('equipment_maintenance_logs');
        Schema::dropIfExists('equipment_dispatches');
        Schema::dropIfExists('equipment');
    }
};
