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
        Schema::create('app_notifications', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->foreignId('client_id')->nullable()->constrained('clients')->onDelete('cascade');
            $table->string('type', 64)->index(); // savings_deposit, milestone_approval_required, deed_status_update, plot_reservation, support_reply, security_alert, system_notice
            $table->string('title');
            $table->text('message');
            $table->string('action_url')->nullable();
            $table->json('data')->nullable(); // Metadata payload
            $table->enum('category', ['financial', 'construction', 'legal', 'support', 'security', 'general'])->default('general')->index();
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->timestamp('read_at')->nullable()->index();
            $table->boolean('is_dismissed')->default(false)->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'read_at']);
            $table->index(['client_id', 'read_at']);
        });

        Schema::create('notification_dispatch_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('notification_id')->nullable()->constrained('app_notifications')->onDelete('cascade');
            $table->string('recipient_type', 64); // User, Client
            $table->unsignedBigInteger('recipient_id');
            $table->string('recipient_phone')->nullable();
            $table->string('recipient_email')->nullable();
            $table->enum('channel', ['in_app', 'sms', 'email', 'whatsapp', 'push'])->index();
            $table->enum('status', ['queued', 'dispatched', 'delivered', 'failed', 'skipped_preference'])->default('queued')->index();
            $table->string('gateway_provider', 64)->nullable(); // africas_talking, twilio, smtp_mail, mock_driver
            $table->string('gateway_message_id')->nullable();
            $table->json('response_payload')->nullable();
            $table->text('error_message')->nullable();
            $table->decimal('cost_ugx', 10, 2)->default(0.00);
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamps();

            $table->index(['recipient_type', 'recipient_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_dispatch_logs');
        Schema::dropIfExists('app_notifications');
    }
};
