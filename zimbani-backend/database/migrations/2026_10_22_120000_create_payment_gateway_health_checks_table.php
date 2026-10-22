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
        // 1. Add health and uptime monitoring metrics to payment_gateway_configs
        Schema::table('payment_gateway_configs', function (Blueprint $table) {
            $table->enum('last_health_status', ['operational', 'degraded', 'outage'])
                ->default('operational')
                ->after('display_order');
            $table->unsignedInteger('last_ping_ms')->nullable()->after('last_health_status');
            $table->timestamp('last_ping_at')->nullable()->after('last_ping_ms');
            $table->decimal('uptime_percentage', 5, 2)->default(99.90)->after('last_ping_at');
        });

        // 2. Gateway Health Checks Telemetry Ledger
        Schema::create('payment_gateway_health_checks', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('gateway_name', 50); // flutterwave, pesapal, mtn_momo, airtel_money, bank_transfer
            $table->enum('status', ['operational', 'degraded', 'outage'])->default('operational');
            $table->unsignedInteger('latency_ms');
            $table->unsignedSmallInteger('http_status')->nullable();
            $table->string('endpoint_tested', 255)->nullable();
            $table->string('message', 500)->nullable();
            $table->timestamp('checked_at')->useCurrent();
            $table->timestamps();

            $table->index(['gateway_name', 'checked_at']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_gateway_health_checks');

        Schema::table('payment_gateway_configs', function (Blueprint $table) {
            $table->dropColumn(['last_health_status', 'last_ping_ms', 'last_ping_at', 'uptime_percentage']);
        });
    }
};
