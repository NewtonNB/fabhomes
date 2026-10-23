<?php

namespace App\Http\Middleware;

use App\Models\SecurityAuditLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SanitizeInputMiddleware
{
    /**
     * Handle an incoming request and sanitize input against XSS vectors.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $input = $request->all();
        $hasThreat = false;
        $threatDetails = [];

        $sanitized = $this->cleanArray($input, $hasThreat, $threatDetails);

        if ($hasThreat) {
            SecurityAuditLog::record(
                'suspicious_input',
                [
                    'detected_patterns' => $threatDetails,
                    'sanitized_fields' => array_keys($threatDetails),
                ],
                $request->user(),
                'warning',
                $request
            );
        }

        $request->merge($sanitized);

        return $next($request);
    }

    /**
     * Recursively clean array input
     */
    protected function cleanArray(array $data, bool &$hasThreat, array &$threatDetails, string $prefix = ''): array
    {
        $cleaned = [];

        foreach ($data as $key => $value) {
            $fieldKey = $prefix ? "{$prefix}.{$key}" : $key;

            if (is_array($value)) {
                $cleaned[$key] = $this->cleanArray($value, $hasThreat, $threatDetails, $fieldKey);
            } elseif (is_string($value)) {
                $original = $value;
                $sanitized = $this->cleanString($value);

                if ($original !== $sanitized) {
                    $hasThreat = true;
                    $threatDetails[$fieldKey] = [
                        'original_snippet' => substr($original, 0, 100),
                        'cleaned_snippet' => substr($sanitized, 0, 100),
                    ];
                }

                $cleaned[$key] = $sanitized;
            } else {
                $cleaned[$key] = $value;
            }
        }

        return $cleaned;
    }

    /**
     * Clean single string against script and event injection
     */
    protected function cleanString(string $val): string
    {
        // Check for script tags
        $val = preg_replace('/<\s*script\b[^>]*>(.*?)<\s*\/\s*script\s*>/is', '', $val);

        // Check for standalone unclosed script tags
        $val = preg_replace('/<\s*script\b[^>]*>/is', '', $val);

        // Check for javascript: pseudoprotocol
        $val = preg_replace('/javascript\s*:/i', '', $val);

        // Check for common malicious inline event handlers
        $val = preg_replace('/\b(onload|onerror|onclick|onmouseover|onfocus|onblur)\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $val);

        // Strip iframe / object / embed tags
        $val = preg_replace('/<\s*(iframe|object|embed|applet)\b[^>]*>(.*?)<\s*\/\s*\1\s*>/is', '', $val);
        $val = preg_replace('/<\s*(iframe|object|embed|applet)\b[^>]*>/is', '', $val);

        return $val;
    }
}
