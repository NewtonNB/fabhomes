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
        Schema::create('sites', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            
            // Basic Information
            $table->string('name');
            $table->string('code')->unique();
            $table->foreignId('project_id')->constrained()->onDelete('cascade');
            
            // Site Classification
            $table->enum('site_type', [
                'construction',
                'sales_office',
                'warehouse',
                'equipment_yard',
                'residential_complex',
                'commercial_complex',
                'mixed_use',
                'other'
            ])->default('construction');
            
            $table->enum('status', [
                'planned',
                'preparation',
                'active',
                'suspended',
                'completed',
                'closed',
                'archived'
            ])->default('planned');
            
            // Location Details
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('region')->nullable();
            $table->string('country')->default('Uganda');
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            
            // Boundaries and Area (GeoJSON polygon for precise boundaries)
            $table->json('boundaries')->nullable()->comment('GeoJSON polygon of site boundaries');
            $table->decimal('total_area', 15, 2)->nullable()->comment('Total area in square meters');
            $table->decimal('buildable_area', 15, 2)->nullable()->comment('Buildable area in square meters');
            
            // Site Management
            $table->foreignId('supervisor_id')->nullable()->constrained('users')->onDelete('set null');
            $table->date('start_date')->nullable();
            $table->date('expected_completion_date')->nullable();
            $table->date('actual_completion_date')->nullable();
            
            // Site Resources
            $table->integer('total_workers')->default(0);
            $table->integer('total_equipment')->default(0);
            $table->integer('total_units')->default(0)->comment('Number of units/plots at this site');
            
            // Financial Tracking
            $table->decimal('allocated_budget', 15, 2)->default(0);
            $table->decimal('actual_spent', 15, 2)->default(0);
            $table->string('currency', 3)->default('UGX');
            
            // Utilities & Facilities
            $table->json('utilities')->nullable()->comment('Available utilities: water, electricity, sewage, etc.');
            $table->json('facilities')->nullable()->comment('On-site facilities: office, storage, etc.');
            
            // Safety & Compliance
            $table->json('safety_measures')->nullable()->comment('Safety equipment and measures in place');
            $table->date('last_inspection_date')->nullable();
            $table->date('next_inspection_date')->nullable();
            
            // Contact Information
            $table->string('contact_person')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('contact_email')->nullable();
            
            // Additional Information
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable()->comment('Additional flexible data storage');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes for performance
            $table->index('project_id');
            $table->index('supervisor_id');
            $table->index('site_type');
            $table->index('status');
            $table->index(['latitude', 'longitude']);
            $table->index('start_date');
            $table->index('expected_completion_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sites');
    }
};
