<?php

namespace App\Services;

use App\Models\PaymentGatewayConfig;
use App\Models\PaymentGatewayHealthCheck;
use App\Services\Gateways\PaymentGatewayManager;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class PaymentGatewayHealthService
{
    public function __construct(
        protected PaymentGatewayManager $gatewayManager
    ) {}

    /**
     * Ping a specific payment gateway and record health telemetry.
     */
    public function pingGateway(string $gatewayName): array
    {
        $config = PaymentGatewayConfig::where('name', $gatewayName)->first();

        try {
            $adapter = $this->gatewayManager->driver($gatewayName);
            $result = $adapter->pingHealth();
        } catch (\Exception $e) {
            Log::error("Gateway [{$gatewayName}] ping failed: " . $e->getMessage());
            $result = [
                'status' => 'degraded',
                'latency_ms' => 999,
                'http_status' => 500,
                'endpoint_tested' => $config?->api_endpoint,
                'message' => 'Connection timeout or error: ' . $e->getMessage(),
            ];
        }

        // Record health check entry
        $check = PaymentGatewayHealthCheck::create([
            'gateway_name' => $gatewayName,
            'status' => $result['status'] ?? 'operational',
            'latency_ms' => $result['latency_ms'] ?? 100,
            'http_status' => $result['http_status'] ?? 200,
            'endpoint_tested' => $result['endpoint_tested'] ?? $config?->api_endpoint,
            'message' => $result['message'] ?? 'Healthy',
            'checked_at' => now(),
        ]);

        // Update PaymentGatewayConfig
        if ($config) {
            // Compute rolling uptime based on last 20 checks
            $recentChecks = PaymentGatewayHealthCheck::where('gateway_name', $gatewayName)
                ->latest('checked_at')
                ->take(20)
                ->get();

            $operationalCount = $recentChecks->where('status', 'operational')->count();
            $uptimePercentage = $recentChecks->count() > 0 
                ? round(($operationalCount / $recentChecks->count()) * 100, 2) 
                : 99.90;

            $config->update([
                'last_health_status' => $result['status'] ?? 'operational',
                'last_ping_ms' => $result['latency_ms'] ?? 100,
                'last_ping_at' => now(),
                'uptime_percentage' => $uptimePercentage,
            ]);
        }

        return [
            'gateway_name' => $gatewayName,
            'status' => $result['status'] ?? 'operational',
            'latency_ms' => $result['latency_ms'] ?? 100,
            'endpoint_tested' => $result['endpoint_tested'] ?? null,
            'message' => $result['message'] ?? 'Healthy',
            'checked_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Ping all registered and active gateways simultaneously.
     */
    public function pingAllGateways(): array
    {
        $configs = PaymentGatewayConfig::where('is_active', true)->get();
        $results = [];

        foreach ($configs as $config) {
            $results[$config->name] = $this->pingGateway($config->name);
        }

        return $results;
    }

    /**
     * Get aggregate health summary and recent telemetry logs.
     */
    public function getHealthSummary(): array
    {
        $configs = PaymentGatewayConfig::active()->get();

        $overallStatus = 'operational';
        $totalLatency = 0;
        $count = 0;

        $gateways = [];
        foreach ($configs as $config) {
            if ($config->last_health_status === 'outage') {
                $overallStatus = 'degraded';
            }

            if ($config->last_ping_ms) {
                $totalLatency += $config->last_ping_ms;
                $count++;
            }

            $gateways[] = [
                'id' => $config->id,
                'uuid' => $config->uuid,
                'name' => $config->name,
                'display_name' => $config->display_name,
                'provider_type' => $config->provider_type,
                'environment' => $config->environment,
                'is_default' => $config->is_default,
                'status' => $config->last_health_status ?? 'operational',
                'latency_ms' => $config->last_ping_ms ?? 115,
                'uptime_percentage' => (float) ($config->uptime_percentage ?? 99.90),
                'last_ping_at' => $config->last_ping_at?->toIso8601String(),
                'supported_methods' => $config->supported_methods,
                'supported_currencies' => $config->supported_currencies,
            ];
        }

        $averageLatencyMs = $count > 0 ? (int) round($totalLatency / $count) : 120;

        $recentLogs = PaymentGatewayHealthCheck::latest('checked_at')
            ->take(15)
            ->get();

        return [
            'overall_status' => $overallStatus,
            'average_latency_ms' => $averageLatencyMs,
            'monitored_gateways_count' => count($gateways),
            'gateways' => $gateways,
            'recent_logs' => $recentLogs,
        ];
    }
}
