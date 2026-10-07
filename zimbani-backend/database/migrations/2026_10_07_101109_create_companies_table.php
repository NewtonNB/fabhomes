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
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            
            // Basic Information
            $table->string('name', 200)->index();
            $table->string('registration_number', 100)->nullable()->unique();
            $table->string('tax_number', 100)->nullable()->unique();
            
            // Contact Information
            $table->string('email', 255)->nullable()->index();
            $table->string('phone', 20)->nullable();
            $table->string('alternate_phone', 20)->nullable();
            
            // Address Information
            $table->text('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('state', 100)->nullable();
            $table->string('country', 100)->default('Uganda');
            $table->string('postal_code', 20)->nullable();
            
            // Online Presence
            $table->string('website', 255)->nullable();
            $table->string('logo_path', 255)->nullable();
            
            // Business Details
            $table->enum('company_type', [
                'real_estate',
                'construction',
                'property_management',
                'land_development',
                'general_contractor',
                'other'
            ])->default('real_estate');
            
            $table->date('established_date')->nullable();
            $table->text('description')->nullable();
            
            // Status & Settings
            $table->enum('status', ['active', 'inactive', 'suspended', 'pending'])->default('active');
            
            // Additional flexible data
            $table->json('metadata')->nullable();
            
            // Relationships
            $table->foreignId('parent_company_id')->nullable()->constrained('companies')->onDelete('set null');
            
            // Timestamps
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('uuid');
            $table->index('company_type');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
