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
        Schema::create('user_notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->json('channels')->nullable(); // {'sms': bool, 'email': bool, 'whatsapp': bool, 'push': bool, 'in_app': bool}
            $table->json('categories')->nullable(); // {'financial': bool, 'construction': bool, 'legal': bool, 'support': bool, 'general': bool}
            $table->boolean('quiet_hours_enabled')->default(false);
            $table->string('quiet_hours_start', 10)->default('22:00');
            $table->string('quiet_hours_end', 10)->default('07:00');
            $table->string('timezone', 50)->default('Africa/Kampala');
            $table->timestamps();
        });

        Schema::create('notification_campaigns', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('message');
            $table->string('target_segment', 64)->index(); // all_clients, active_savers, plot_holders, site_investors, all_users
            $table->json('channels'); // ['in_app', 'sms', 'email', 'whatsapp']
            $table->enum('category', ['financial', 'construction', 'legal', 'support', 'security', 'general'])->default('general');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->string('action_url')->nullable();
            $table->unsignedInteger('total_targeted')->default(0);
            $table->unsignedInteger('total_dispatched')->default(0);
            $table->unsignedInteger('total_failed')->default(0);
            $table->enum('status', ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled'])->default('completed')->index();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('dispatched_at')->nullable()->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_campaigns');
        Schema::dropIfExists('user_notification_preferences');
    }
};
