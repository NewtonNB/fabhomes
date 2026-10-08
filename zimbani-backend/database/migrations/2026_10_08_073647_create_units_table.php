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
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            
            // Basic Information
            $table->string('unit_number')->unique();
            $table->string('name');
            $table->foreignId('site_id')->constrained()->onDelete('cascade');
            $table->foreignId('project_id')->constrained()->onDelete('cascade');
            
            // Unit Classification
            $table->enum('unit_type', [
                'apartment',
                'house',
                'villa',
                'townhouse',
                'penthouse',
                'studio',
                'office',
                'shop',
                'warehouse',
                'plot',
                'parking',
                'other'
            ])->default('apartment');
            
            $table->enum('status', [
                'planned',
                'under_construction',
                'completed',
                'available',
                'reserved',
                'sold',
                'occupied',
                'maintenance',
                'unavailable'
            ])->default('planned');
            
            // Physical Specifications
            $table->integer('floor_number')->nullable();
            $table->string('block_number')->nullable();
            $table->decimal('area', 10, 2)->nullable()->comment('Area in square meters');
            $table->string('area_unit', 10)->default('sqm');
            $table->integer('bedrooms')->nullable();
            $table->integer('bathrooms')->nullable();
            $table->boolean('has_balcony')->default(false);
            $table->boolean('has_parking')->default(false);
            $table->integer('parking_slots')->nullable();
            
            // Pricing Information
            $table->decimal('base_price', 15, 2)->nullable();
            $table->decimal('current_price', 15, 2)->nullable();
            $table->decimal('discount', 15, 2)->nullable()->default(0);
            $table->string('currency', 3)->default('UGX');
            $table->enum('price_type', ['fixed', 'negotiable', 'per_sqm'])->default('fixed');
            
            // Client/Owner Information
            $table->foreignId('client_id')->nullable()->constrained('users')->onDelete('set null');
            $table->date('reserved_date')->nullable();
            $table->date('sold_date')->nullable();
            $table->date('handover_date')->nullable();
            $table->decimal('amount_paid', 15, 2)->nullable()->default(0);
            $table->decimal('balance', 15, 2)->nullable();
            
            // Construction Details
            $table->date('construction_start_date')->nullable();
            $table->date('expected_completion_date')->nullable();
            $table->date('actual_completion_date')->nullable();
            $table->integer('completion_percentage')->default(0);
            
            // Features & Amenities (JSON)
            $table->json('features')->nullable()->comment('Internal features: kitchen, wardrobes, etc.');
            $table->json('amenities')->nullable()->comment('Access to: gym, pool, security, etc.');
            $table->json('specifications')->nullable()->comment('Technical specs: wiring, plumbing, etc.');
            
            // Location within Site
            $table->string('location_description')->nullable();
            $table->string('facing_direction')->nullable()->comment('North, South, East, West');
            $table->string('view_description')->nullable();
            
            // Documents & Media
            $table->json('images')->nullable()->comment('Array of image URLs');
            $table->json('floor_plans')->nullable()->comment('Array of floor plan URLs');
            $table->json('documents')->nullable()->comment('Array of document URLs');
            
            // Financial Tracking
            $table->decimal('maintenance_fee', 10, 2)->nullable();
            $table->string('maintenance_frequency')->nullable()->comment('monthly, quarterly, yearly');
            
            // Quality Control
            $table->date('last_inspection_date')->nullable();
            $table->date('next_inspection_date')->nullable();
            $table->text('inspection_notes')->nullable();
            $table->boolean('is_defect_free')->default(false);
            
            // Additional Information
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes for performance
            $table->index('site_id');
            $table->index('project_id');
            $table->index('client_id');
            $table->index('unit_type');
            $table->index('status');
            $table->index('floor_number');
            $table->index(['current_price', 'status']);
            $table->index('construction_start_date');
            $table->index('expected_completion_date');
            $table->index('completion_percentage');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
