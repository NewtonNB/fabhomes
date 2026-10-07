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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            
            // Company relationship
            $table->foreignId('company_id')->constrained('companies')->onDelete('cascade');
            
            // Basic Information
            $table->string('name');
            $table->string('code')->unique(); // Unique project code (e.g., PRJ-001)
            $table->text('description')->nullable();
            
            // Project Type & Status
            $table->enum('project_type', [
                'residential',
                'commercial',
                'industrial',
                'infrastructure',
                'mixed_use',
                'other'
            ])->default('residential');
            
            $table->enum('status', [
                'planning',
                'active',
                'on_hold',
                'completed',
                'cancelled'
            ])->default('planning');
            
            // Timeline
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->date('actual_completion_date')->nullable();
            
            // Financial
            $table->decimal('budget', 15, 2)->nullable();
            $table->string('currency', 3)->default('UGX'); // ISO currency code
            $table->decimal('total_spent', 15, 2)->default(0);
            
            // Location
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('country')->default('Uganda');
            $table->string('postal_code')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            
            // Contact Information
            $table->string('contact_person')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            
            // Additional Details
            $table->integer('total_units')->nullable(); // For residential projects
            $table->decimal('total_area', 12, 2)->nullable(); // In square meters
            $table->string('area_unit')->default('sqm'); // sqm, sqft, acres
            
            // Metadata
            $table->json('metadata')->nullable(); // Custom fields
            
            // Timestamps and soft deletes
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('uuid');
            $table->index('company_id');
            $table->index('code');
            $table->index('project_type');
            $table->index('status');
            $table->index(['start_date', 'end_date']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
