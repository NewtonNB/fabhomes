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
        Schema::create('notification_drip_triggers', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('campaign_type', 64)->index(); // savings_reminder, plot_expiry, milestone_nudge, dormant_client
            $table->string('trigger_key', 191)->unique(); // Idempotency key e.g. plot_res_12_3d, savings_due_5_2026_10
            $table->foreignId('recipient_user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->foreignId('recipient_client_id')->nullable()->constrained('clients')->onDelete('cascade');
            $table->string('entity_type', 128)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('title');
            $table->text('message');
            $table->json('channels_attempted')->nullable();
            $table->json('channels_succeeded')->nullable();
            $table->enum('status', ['pending', 'dispatched', 'skipped', 'failed'])->default('pending')->index();
            $table->boolean('is_dry_run')->default(false)->index();
            $table->json('dispatch_summary')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('dispatched_at')->nullable()->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['campaign_type', 'status']);
            $table->index(['entity_type', 'entity_id']);
            $table->index(['recipient_user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_drip_triggers');
    }
};
