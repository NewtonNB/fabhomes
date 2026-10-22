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
        // 1. Enhance payment_webhook_logs with security & replay telemetry
        Schema::table('payment_webhook_logs', function (Blueprint $table) {
            $table->boolean('signature_valid')->default(false)->after('status');
            $table->string('signature_hash', 128)->nullable()->after('signature_valid');
            $table->string('payload_hash', 64)->nullable()->after('signature_hash');
            $table->boolean('is_replay')->default(false)->after('payload_hash');
            $table->boolean('ip_whitelisted')->default(true)->after('is_replay');
            $table->unsignedInteger('processing_duration_ms')->default(0)->after('ip_whitelisted');
            $table->unsignedInteger('retry_count')->default(0)->after('processing_duration_ms');
            $table->unsignedInteger('max_retries')->default(5)->after('retry_count');
            $table->timestamp('next_retry_at')->nullable()->after('max_retries');
            $table->foreignId('payment_intent_id')
                ->nullable()
                ->after('mobile_money_transaction_id')
                ->constrained('payment_intents')
                ->nullOnDelete();

            $table->index(['payload_hash', 'created_at'], 'idx_pwl_payload_hash');
            $table->index(['status', 'next_retry_at'], 'idx_pwl_retry_status');
        });

        // 2. Enhance payment_gateway_configs with IP whitelists & replay settings
        Schema::table('payment_gateway_configs', function (Blueprint $table) {
            $table->json('ip_whitelist')->nullable()->after('webhook_secret');
            $table->boolean('enforce_ip_whitelist')->default(false)->after('ip_whitelist');
            $table->boolean('enforce_signature')->default(true)->after('enforce_ip_whitelist');
            $table->unsignedInteger('replay_window_seconds')->default(300)->after('enforce_signature'); // 5 minutes window
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_gateway_configs', function (Blueprint $table) {
            $table->dropColumn([
                'ip_whitelist',
                'enforce_ip_whitelist',
                'enforce_signature',
                'replay_window_seconds',
            ]);
        });

        Schema::table('payment_webhook_logs', function (Blueprint $table) {
            $table->dropForeign(['payment_intent_id']);
            $table->dropIndex('idx_pwl_payload_hash');
            $table->dropIndex('idx_pwl_retry_status');
            $table->dropColumn([
                'signature_valid',
                'signature_hash',
                'payload_hash',
                'is_replay',
                'ip_whitelisted',
                'processing_duration_ms',
                'retry_count',
                'max_retries',
                'next_retry_at',
                'payment_intent_id',
            ]);
        });
    }
};
