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
        Schema::create('milestone_progress_photos', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            
            // Relational linkages
            $table->foreignId('milestone_verification_id')->nullable()->constrained('milestone_verifications')->nullOnDelete();
            $table->foreignId('milestone_id')->constrained('construction_milestones')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('site_id')->nullable()->constrained('sites')->nullOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            
            // Photo details
            $table->string('title', 255);
            $table->text('caption')->nullable();
            $table->string('photo_url', 500);
            $table->string('thumbnail_url', 500)->nullable();
            
            // Construction Phase Tag
            $table->enum('photo_stage', [
                'pre_work',
                'during_construction',
                'reinforcement_check',
                'concrete_pour',
                'masonry_framing',
                'mep_installation',
                'finishes',
                'completed_stage',
                'defect_snag',
            ])->default('during_construction');
            
            // Timestamp and Geotagging
            $table->dateTime('captured_at')->useCurrent();
            $table->decimal('gps_latitude', 10, 7)->nullable();
            $table->decimal('gps_longitude', 10, 7)->nullable();
            $table->decimal('gps_accuracy', 8, 2)->nullable();
            $table->string('camera_make_model', 255)->nullable();
            
            // Upload & Visibility
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_client_visible')->default(true);
            $table->boolean('is_featured')->default(false);
            
            // Client Review & Snag Flagging
            $table->boolean('client_flagged')->default(false);
            $table->text('client_flag_notes')->nullable();
            $table->dateTime('client_flagged_at')->nullable();
            $table->foreignId('client_flagged_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->softDeletes();
            $table->timestamps();

            // Indexes
            $table->index('milestone_verification_id');
            $table->index('milestone_id');
            $table->index('project_id');
            $table->index('unit_id');
            $table->index('photo_stage');
            $table->index('captured_at');
            $table->index('is_client_visible');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('milestone_progress_photos');
    }
};
