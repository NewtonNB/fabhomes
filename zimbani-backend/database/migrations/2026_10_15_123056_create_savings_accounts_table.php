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
        Schema::create('savings_accounts', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('account_number', 50)->unique();
            
            // Client Owner
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            
            // Scheme Classification
            $table->enum('account_type', ['land_saving', 'construction_saving'])->default('land_saving');
            $table->string('scheme_name', 100)->nullable();
            
            // Financial Parameters
            $table->decimal('target_amount', 15, 2);
            $table->decimal('current_balance', 15, 2)->default(0.00);
            $table->string('currency', 3)->default('UGX');
            
            // Account Status
            $table->enum('status', ['active', 'suspended', 'completed', 'closed'])->default('active');
            
            // Timelines
            $table->date('opened_date');
            $table->date('target_date')->nullable();
            $table->date('closed_date')->nullable();
            
            // Associated Real Estate Resources
            $table->foreignId('plot_id')->nullable()->constrained('units')->onDelete('set null');
            $table->foreignId('project_id')->nullable()->constrained('projects')->onDelete('set null');
            
            // Additional Details
            $table->text('notes')->nullable();
            
            // Audit Trails
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes for high performance querying
            $table->index(['client_id', 'status']);
            $table->index(['account_type', 'status']);
            $table->index('target_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('savings_accounts');
    }
};
