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
        // 1. Site Daily Logs Table
        Schema::create('site_daily_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('log_number', 32)->unique();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->date('log_date');
            $table->enum('weather_condition', [
                'clear',
                'sunny',
                'partly_cloudy',
                'cloudy',
                'light_rain',
                'heavy_rain',
                'stormy',
                'high_winds',
            ])->default('sunny');
            $table->decimal('temperature_celsius', 4, 1)->nullable();
            $table->boolean('work_delayed_by_weather')->default(false);
            $table->decimal('delay_hours', 4, 2)->default(0.00);
            $table->unsignedInteger('labor_headcount')->default(0);
            $table->unsignedInteger('subcontractor_headcount')->default(0);
            $table->text('work_performed_summary');
            $table->text('delays_or_impediments')->nullable();
            $table->text('materials_received_notes')->nullable();
            $table->text('equipment_on_site_notes')->nullable();
            $table->text('visitors_log')->nullable();
            $table->foreignId('supervisor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['draft', 'submitted', 'approved'])->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['site_id', 'log_date']);
            $table->index(['status']);
        });

        // 2. Safety Incidents & Near Misses Table
        Schema::create('safety_incidents', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('incident_number', 32)->unique();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('site_daily_log_id')->nullable()->constrained('site_daily_logs')->nullOnDelete();
            $table->enum('incident_type', [
                'near_miss',
                'first_aid',
                'medical_treatment',
                'lost_time_injury',
                'property_damage',
                'environmental',
                'security',
                'other',
            ])->default('near_miss');
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('low');
            $table->date('incident_date');
            $table->time('incident_time')->nullable();
            $table->string('location_details');
            $table->string('title');
            $table->text('description');
            $table->text('immediate_actions_taken')->nullable();
            $table->text('root_cause_analysis')->nullable();
            $table->text('preventative_measures')->nullable();
            $table->string('injured_person_name')->nullable();
            $table->enum('injured_person_type', ['worker', 'subcontractor', 'visitor', 'public', 'none'])->default('none');
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('investigated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('investigated_at')->nullable();
            $table->enum('status', ['reported', 'investigating', 'action_required', 'closed'])->default('reported');
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['site_id', 'incident_date']);
            $table->index(['severity', 'status']);
        });

        // 3. Safety Toolbox Talks & Briefings Table
        Schema::create('safety_toolbox_talks', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('talk_number', 32)->unique();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('site_daily_log_id')->nullable()->constrained('site_daily_logs')->nullOnDelete();
            $table->foreignId('conducted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('topic');
            $table->enum('category', [
                'ppe',
                'working_at_height',
                'electrical_safety',
                'excavation',
                'heavy_equipment',
                'fire_safety',
                'housekeeping',
                'heat_stress',
                'hazardous_materials',
                'other',
            ])->default('ppe');
            $table->date('conducted_at');
            $table->unsignedSmallInteger('duration_minutes')->default(15);
            $table->unsignedSmallInteger('attendees_count')->default(0);
            $table->json('attendees_names')->nullable();
            $table->text('key_discussion_points');
            $table->text('hazards_identified')->nullable();
            $table->text('supervisor_notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['site_id', 'conducted_at']);
            $table->index(['category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('safety_toolbox_talks');
        Schema::dropIfExists('safety_incidents');
        Schema::dropIfExists('site_daily_logs');
    }
};
