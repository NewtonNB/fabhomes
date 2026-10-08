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
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('client_number', 50)->unique(); // FAB-CLI-XXXXX
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null'); // Linked user account
            
            // Personal Information
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            
            // Contact Information
            $table->string('email')->nullable();
            $table->string('phone_primary', 20);
            $table->string('phone_secondary', 20)->nullable();
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('district', 100)->nullable();
            $table->string('country', 100)->default('Uganda');
            $table->string('postal_code', 20)->nullable();
            
            // Identification
            $table->string('id_type', 50)->nullable(); // national_id, passport, driving_license
            $table->string('id_number', 100)->nullable();
            $table->date('id_expiry_date')->nullable();
            
            // Next of Kin
            $table->string('nok_name')->nullable();
            $table->string('nok_relationship', 100)->nullable();
            $table->string('nok_phone', 20)->nullable();
            $table->text('nok_address')->nullable();
            
            // Status
            $table->enum('status', ['active', 'inactive', 'suspended', 'closed'])->default('active');
            $table->enum('kyc_status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->timestamp('kyc_verified_at')->nullable();
            $table->foreignId('kyc_verified_by')->nullable()->constrained('users')->onDelete('set null');
            
            // Metadata
            $table->text('notes')->nullable();
            $table->json('tags')->nullable();
            
            // Audit
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('client_number');
            $table->index('email');
            $table->index('phone_primary');
            $table->index('status');
            $table->index('kyc_status');
            $table->index(['first_name', 'last_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
