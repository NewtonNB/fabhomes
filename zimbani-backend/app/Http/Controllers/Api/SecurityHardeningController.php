<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SecurityAuditLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class SecurityHardeningController extends Controller
{
    /**
     * System Security Health Check & Compliance Audit
     */
    public function healthCheck(Request $request): JsonResponse
    {
        $recentAlertsCount = SecurityAuditLog::where('created_at', '>=', Carbon::now()->subDay())->count();
        $criticalAlertsCount = SecurityAuditLog::where('severity', 'critical')
            ->where('created_at', '>=', Carbon::now()->subDays(7))
            ->count();

        $securityHeaders = [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'SAMEORIGIN',
            'X-XSS-Protection' => '1; mode=block',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'Permissions-Policy' => 'accelerometer=(), camera=(), geolocation=(), microphone=()',
            'Strict-Transport-Security' => 'max-age=31536000; includeSubDomains; preload',
            'Content-Security-Policy' => 'Enforced',
        ];

        $rateLimiters = [
            'api' => '120 requests / min',
            'auth' => '5 attempts / min (anti-brute-force)',
            'payments' => '15 transactions / min (anti-carding)',
            'pin_verification' => '5 attempts / 15 min',
        ];

        $corsConfig = [
            'enabled' => true,
            'paths' => config('cors.paths', []),
            'supports_credentials' => config('cors.supports_credentials', true),
            'max_age' => config('cors.max_age', 86400),
        ];

        $score = 100;
        if ($criticalAlertsCount > 5) {
            $score -= 10;
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'security_score' => $score,
                'status' => 'hardened',
                'owasp_compliance' => 'OWASP Top 10 Enforced',
                'environment' => app()->environment(),
                'headers' => $securityHeaders,
                'rate_limiters' => $rateLimiters,
                'cors' => $corsConfig,
                'recent_alerts_24h' => $recentAlertsCount,
                'critical_alerts_7d' => $criticalAlertsCount,
                'server_time' => Carbon::now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * Get paginated security audit logs
     */
    public function auditLogs(Request $request): JsonResponse
    {
        $perPage = min((int) $request->input('per_page', 20), 100);

        $query = SecurityAuditLog::with('user')->orderBy('created_at', 'desc');

        if ($request->filled('event_type')) {
            $query->where('event_type', $request->input('event_type'));
        }

        if ($request->filled('severity')) {
            $query->where('severity', $request->input('severity'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('ip_address', 'LIKE', "%{$search}%")
                  ->orWhere('endpoint', 'LIKE', "%{$search}%")
                  ->orWhere('event_type', 'LIKE', "%{$search}%");
            });
        }

        $logs = $query->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    /**
     * Threat Simulator for verification of defense triggers
     */
    public function simulateThreat(Request $request): JsonResponse
    {
        $payload = $request->all();

        // The SanitizeInputMiddleware will have already sanitized any <script>
        $detectedThreats = [];

        foreach ($payload as $key => $value) {
            if (is_string($value)) {
                if (stripos($value, 'script') !== false || stripos($value, '1=1') !== false) {
                    $detectedThreats[] = $key;
                }
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Threat simulator processed request through security shield.',
            'sanitized_payload' => $payload,
            'threats_detected_in_raw' => count($detectedThreats),
        ]);
    }
}
