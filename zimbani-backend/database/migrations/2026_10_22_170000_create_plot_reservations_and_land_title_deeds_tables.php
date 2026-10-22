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
        // 1. Plot Reservations Table
        Schema::create('plot_reservations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('reservation_number')->unique();
            
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('unit_id')->constrained('units')->onDelete('cascade');
            $table->foreignId('site_id')->constrained('sites')->onDelete('cascade');
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            
            $table->enum('status', [
                'pending',
                'confirmed',
                'expired',
                'cancelled',
                'converted_to_sale',
            ])->default('confirmed');

            $table->decimal('reservation_fee', 15, 2)->default(500000.00);
            $table->decimal('reservation_fee_paid', 15, 2)->default(500000.00);
            $table->foreignId('payment_intent_id')->nullable()->constrained('payment_intents')->nullOnDelete();
            $table->string('payment_method')->default('mobile_money');
            
            $table->timestamp('reserved_at')->useCurrent();
            $table->timestamp('expires_at')->nullable();
            
            $table->boolean('terms_accepted')->default(true);
            $table->text('client_notes')->nullable();
            $table->text('admin_notes')->nullable();
            $table->string('cancellation_reason')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('reservation_number');
            $table->index(['client_id', 'status']);
            $table->index(['unit_id', 'status']);
            $table->index('expires_at');
        });

        // 2. Land Title Deeds Tracking Table
        Schema::create('land_title_deeds', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('deed_number')->unique();
            $table->string('title_number')->nullable(); // e.g. FRV 1290 Folio 23 / Busiro Block 450 Plot 12
            
            $table->foreignId('unit_id')->constrained('units')->onDelete('cascade');
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            
            $table->enum('tenure_type', [
                'mailo',
                'freehold',
                'leasehold',
                'customary',
            ])->default('mailo');

            $table->enum('overall_stage', [
                'boundary_survey',
                'ministry_mutation',
                'deed_plan',
                'title_registration',
                'deed_handover',
            ])->default('boundary_survey');

            $table->integer('overall_progress_percentage')->default(20);

            // Stage 1: Cadastral Survey & Boundary Opening
            $table->enum('cadastral_survey_status', ['pending', 'in_progress', 'completed'])->default('in_progress');
            $table->date('cadastral_survey_date')->nullable();
            $table->string('surveyor_name')->nullable();
            $table->enum('boundary_opening_status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->json('beacon_coordinates')->nullable(); // [{"beacon": "B1", "lat": 0.3476, "lng": 32.5825}]

            // Stage 2: Ministry Zonal Office & Mutation
            $table->enum('mutation_status', ['pending', 'submitted_to_ministry', 'approved', 'rejected'])->default('pending');
            $table->string('ministry_zonal_office')->nullable(); // e.g. Wakiso MZO, Mukono MZO
            $table->string('zonal_reference_number')->nullable();
            $table->date('submission_date')->nullable();
            $table->date('approval_date')->nullable();

            // Stage 3: Deed Plan Generation
            $table->enum('deed_plan_status', ['pending', 'drafted', 'approved'])->default('pending');
            $table->string('deed_plan_number')->nullable();
            $table->date('deed_plan_date')->nullable();

            // Stage 4 & 5: Title Deed Registration & Physical Handover
            $table->enum('title_registration_status', ['pending', 'processing', 'registered', 'transferred'])->default('pending');
            $table->date('registration_date')->nullable();
            $table->enum('handover_status', ['in_custody', 'scheduled_handover', 'handed_over'])->default('in_custody');
            $table->date('handover_date')->nullable();

            // Metadata & Documents
            $table->foreignId('document_id')->nullable()->constrained('documents')->nullOnDelete();
            $table->date('estimated_completion_date')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('deed_number');
            $table->index('title_number');
            $table->index(['client_id', 'overall_stage']);
            $table->index(['unit_id', 'overall_stage']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('land_title_deeds');
        Schema::dropIfExists('plot_reservations');
    }
};
