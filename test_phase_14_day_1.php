<?php

/**
 * Phase 14 Day 1 Verification Test Suite
 * OWASP Security Audit, SQLi/XSS Prevention, CSRF/CORS Lockdown, Rate Limiting & API Shielding
 */

require_once __DIR__ . '/zimbani-backend/vendor/autoload.php';
$app = require_once __DIR__ . '/zimbani-backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\Api\SecurityHardeningController;
use App\Http\Middleware\SanitizeInputMiddleware;
use App\Http\Middleware\SecurityHeadersMiddleware;
use App\Models\SecurityAuditLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

$totalTests = 0;
$passedTests = 0;

function assertTest(string $description, bool $condition, string $detail = ''): void {
    global $totalTests, $passedTests;
    $totalTests++;
    if ($condition) {
        $passedTests++;
        echo "  [PASS] {$description}\n";
    } else {
        echo "  [FAIL] {$description} : {$detail}\n";
    }
}

echo "\n=======================================================\n";
echo "  PHASE 14 DAY 1: OWASP SECURITY HARDENING & SHIELD TEST\n";
echo "=======================================================\n\n";

DB::beginTransaction();

try {
    // ------------------------------------------------------------------------
    // SETUP: Test Fixtures
    // ------------------------------------------------------------------------
    echo "--- 1. Setting Up Test Fixtures ---\n";

    $suffix = rand(1000, 9999);
    $user = User::create([
        'name' => "Security Officer {$suffix}",
        'email' => "security{$suffix}@zimbani.com",
        'phone' => "+25679999{$suffix}",
        'password' => bcrypt('StrongPass#2026!'),
        'status' => 'active',
    ]);
    assertTest("User fixture created", $user->id > 0);

    // ------------------------------------------------------------------------
    // SECTION 2: SecurityAuditLog Model & Helper
    // ------------------------------------------------------------------------
    echo "\n--- 2. Testing SecurityAuditLog Model & Event Logger ---\n";

    $log = SecurityAuditLog::record(
        'auth_failure',
        ['reason' => 'Invalid password attempt', 'attempt' => 3],
        $user,
        'warning'
    );

    assertTest("SecurityAuditLog created with UUID", !empty($log->uuid));
    assertTest("SecurityAuditLog user relationship works", $log->user->id === $user->id);
    assertTest("SecurityAuditLog event_type is auth_failure", $log->event_type === 'auth_failure');
    assertTest("SecurityAuditLog details cast to array", is_array($log->details));
    assertTest("SecurityAuditLog ip_address is captured", !empty($log->ip_address));

    // ------------------------------------------------------------------------
    // SECTION 3: OWASP Security Headers Middleware
    // ------------------------------------------------------------------------
    echo "\n--- 3. Testing SecurityHeadersMiddleware (OWASP Headers) ---\n";

    $headersMiddleware = new SecurityHeadersMiddleware();
    $request = Request::create('/api/v1/test', 'GET');
    
    $response = $headersMiddleware->handle($request, function ($req) {
        return new Response('OK', 200, ['Content-Type' => 'text/plain']);
    });

    assertTest("Header X-Content-Type-Options: nosniff present", 
        $response->headers->get('X-Content-Type-Options') === 'nosniff');
    assertTest("Header X-Frame-Options: SAMEORIGIN present", 
        $response->headers->get('X-Frame-Options') === 'SAMEORIGIN');
    assertTest("Header X-XSS-Protection: 1; mode=block present", 
        $response->headers->get('X-XSS-Protection') === '1; mode=block');
    assertTest("Header Referrer-Policy: strict-origin-when-cross-origin present", 
        $response->headers->get('Referrer-Policy') === 'strict-origin-when-cross-origin');
    assertTest("Header Permissions-Policy present and restrictive", 
        str_contains($response->headers->get('Permissions-Policy'), 'camera=()'));
    assertTest("Header Strict-Transport-Security (HSTS) present", 
        str_contains($response->headers->get('Strict-Transport-Security'), 'max-age=31536000'));
    assertTest("Header Content-Security-Policy present", 
        str_contains($response->headers->get('Content-Security-Policy'), "default-src 'self'"));

    // ------------------------------------------------------------------------
    // SECTION 4: Input Sanitization & XSS Defense Shield
    // ------------------------------------------------------------------------
    echo "\n--- 4. Testing SanitizeInputMiddleware (XSS Neutralization) ---\n";

    $sanitizeMiddleware = new SanitizeInputMiddleware();

    // Clean input test
    $cleanReq = Request::create('/api/v1/test', 'POST', [
        'name' => 'Alice Green',
        'notes' => 'Regular architectural specification notes.',
    ]);
    $sanitizeMiddleware->handle($cleanReq, function ($req) {
        return new Response('OK');
    });
    assertTest("Clean input passes unmodified", $cleanReq->input('name') === 'Alice Green');

    // Malicious XSS vector test: <script>
    $maliciousReq1 = Request::create('/api/v1/test', 'POST', [
        'title' => 'Plot Inquiry <script>alert("XSS-ATTACK")</script>',
        'body' => 'Please contact me at the estate.',
    ]);
    $sanitizeMiddleware->handle($maliciousReq1, function ($req) {
        return new Response('OK');
    });
    assertTest("XSS <script> tag is completely stripped", 
        !str_contains($maliciousReq1->input('title'), '<script>') && !str_contains($maliciousReq1->input('title'), 'alert("XSS-ATTACK")'));

    // Malicious XSS vector test: inline onerror
    $maliciousReq2 = Request::create('/api/v1/test', 'POST', [
        'avatar' => '<img src=invalid onerror=alert(document.cookie)>',
    ]);
    $sanitizeMiddleware->handle($maliciousReq2, function ($req) {
        return new Response('OK');
    });
    assertTest("XSS inline event handler onerror= is stripped", 
        !str_contains($maliciousReq2->input('avatar'), 'onerror='));

    // Malicious XSS vector test: javascript: protocol
    $maliciousReq3 = Request::create('/api/v1/test', 'POST', [
        'website' => 'javascript:void(document.location="http://evil.com")',
    ]);
    $sanitizeMiddleware->handle($maliciousReq3, function ($req) {
        return new Response('OK');
    });
    assertTest("XSS javascript: pseudoprotocol is stripped", 
        !str_contains($maliciousReq3->input('website'), 'javascript:'));

    // Verify security audit log recorded suspicious_input
    $threatLogsCount = SecurityAuditLog::where('event_type', 'suspicious_input')->count();
    assertTest("SecurityAuditLog automatically recorded suspicious_input events", $threatLogsCount >= 1);

    // ------------------------------------------------------------------------
    // SECTION 5: SQL Injection (SQLi) Immunity Verification
    // ------------------------------------------------------------------------
    echo "\n--- 5. Testing SQL Injection Immunity ---\n";

    // Test classical tautology injection
    $sqliInput1 = "' OR 1=1 --";
    $result1 = User::where('email', $sqliInput1)->first();
    assertTest("SQLi tautology input (' OR 1=1 --) does not bypass Eloquent query", $result1 === null);

    // Test UNION based injection attempt
    $sqliInput2 = "admin' UNION SELECT null, null, null --";
    $result2 = User::where('email', $sqliInput2)->first();
    assertTest("SQLi UNION attempt does not inject", $result2 === null);

    // Test stacked query injection attempt
    $sqliInput3 = "nonexistent'; DROP TABLE dummy_nonexistent; --";
    $result3 = User::where('email', $sqliInput3)->first();
    assertTest("SQLi stacked query is parameterized safely", $result3 === null);

    // ------------------------------------------------------------------------
    // SECTION 6: CORS & CSRF Lockdown Configuration
    // ------------------------------------------------------------------------
    echo "\n--- 6. Testing CORS Configuration ---\n";

    $corsPaths = config('cors.paths');
    assertTest("CORS covers api/* routes", in_array('api/*', $corsPaths));
    assertTest("CORS covers sanctum/csrf-cookie", in_array('sanctum/csrf-cookie', $corsPaths));
    assertTest("CORS supports_credentials is true", config('cors.supports_credentials') === true);
    assertTest("CORS exposed_headers includes Retry-After", in_array('Retry-After', config('cors.exposed_headers')));

    // ------------------------------------------------------------------------
    // SECTION 7: API Rate Limiting Shield
    // ------------------------------------------------------------------------
    echo "\n--- 7. Testing Rate Limiting Shield ---\n";

    $testKey = "test_rate_" . rand(1000, 9999);
    RateLimiter::clear($testKey);

    // Hit rate limiter up to threshold
    for ($i = 0; $i < 5; $i++) {
        RateLimiter::hit($testKey, 60);
    }
    assertTest("RateLimiter records hits up to threshold (5)", RateLimiter::attempts($testKey) === 5);
    assertTest("RateLimiter reports tooManyAttempts when limit exceeded", RateLimiter::tooManyAttempts($testKey, 5));
    assertTest("RateLimiter provides remaining seconds until reset", RateLimiter::availableIn($testKey) > 0);

    // ------------------------------------------------------------------------
    // SECTION 8: SecurityHardeningController Endpoints
    // ------------------------------------------------------------------------
    echo "\n--- 8. Testing SecurityHardeningController Endpoints ---\n";

    $controller = app(SecurityHardeningController::class);

    // GET /api/v1/security/health-check
    $reqHealth = Request::create('/api/v1/security/health-check', 'GET');
    $resHealth = $controller->healthCheck($reqHealth);
    $dataHealth = $resHealth->getData(true);
    assertTest("healthCheck() returns 200", $resHealth->status() === 200);
    assertTest("healthCheck() returns security_score", isset($dataHealth['data']['security_score']) && $dataHealth['data']['security_score'] >= 90);
    assertTest("healthCheck() reports OWASP compliance", isset($dataHealth['data']['owasp_compliance']));
    assertTest("healthCheck() returns active rate limiters", isset($dataHealth['data']['rate_limiters']['auth']));

    // GET /api/v1/security/audit-logs
    $reqLogs = Request::create('/api/v1/security/audit-logs', 'GET', ['per_page' => 10]);
    $resLogs = $controller->auditLogs($reqLogs);
    $dataLogs = $resLogs->getData(true);
    assertTest("auditLogs() returns 200", $resLogs->status() === 200);
    assertTest("auditLogs() returns paginated list", isset($dataLogs['pagination']['total']) && $dataLogs['pagination']['total'] >= 1);

    // POST /api/v1/security/simulate-threat
    $reqThreat = Request::create('/api/v1/security/simulate-threat', 'POST', [
        'payload_field' => 'Harmless message',
    ]);
    $resThreat = $controller->simulateThreat($reqThreat);
    $dataThreat = $resThreat->getData(true);
    assertTest("simulateThreat() returns 200", $resThreat->status() === 200);
    assertTest("simulateThreat() processes payload through shield", $dataThreat['status'] === 'success');

} finally {
    DB::rollBack();
}

echo "\n=======================================================\n";
echo "  PHASE 14 DAY 1 VERIFICATION RESULTS: {$passedTests}/{$totalTests} PASSED (" . round(($passedTests / max(1, $totalTests)) * 100) . "%)\n";
echo "=======================================================\n\n";

if ($passedTests === $totalTests) {
    exit(0);
} else {
    exit(1);
}
