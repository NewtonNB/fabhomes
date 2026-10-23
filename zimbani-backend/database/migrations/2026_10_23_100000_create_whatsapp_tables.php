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
        Schema::create('whatsapp_messages', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('client_id')->nullable()->constrained('clients')->onDelete('set null');
            $table->foreignId('notification_id')->nullable()->constrained('app_notifications')->onDelete('set null');
            $table->enum('direction', ['outbound', 'inbound'])->default('outbound')->index();
            $table->string('wa_message_id', 128)->nullable()->unique(); // Meta wamid.HBg...
            $table->string('phone_number', 32)->index();
            $table->enum('message_type', ['template', 'text', 'interactive', 'button_reply', 'image', 'document'])->default('text');
            $table->string('template_name', 64)->nullable();
            $table->text('body');
            $table->json('payload')->nullable(); // Raw Meta request or response payload
            $table->enum('status', ['queued', 'sent', 'delivered', 'read', 'failed'])->default('queued')->index();
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['phone_number', 'direction']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('whatsapp_webhooks_log', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('event_type', 64)->index(); // messages, message_status, unknown
            $table->string('sender_phone', 32)->nullable()->index();
            $table->json('payload');
            $table->boolean('signature_valid')->default(false);
            $table->boolean('processed')->default(false);
            $table->text('error')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_webhooks_log');
        Schema::dropIfExists('whatsapp_messages');
    }
};
