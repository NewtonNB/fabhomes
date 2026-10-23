<?php

namespace App\Services\Notifications\Drivers;

use App\Services\Notifications\Contracts\SmsDriverInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AfricasTalkingSmsDriver implements SmsDriverInterface
{
    protected ?string $username;
    protected ?string $apiKey;
    protected ?string $fromSender;
    protected MockSmsDriver $mockFallback;

    public function __construct()
    {
        $this->username = config('services.africastalking.username', env('AFRICASTALKING_USERNAME'));
        $this->apiKey = config('services.africastalking.api_key', env('AFRICASTALKING_API_KEY'));
        $this->fromSender = config('services.africastalking.from', env('AFRICASTALKING_FROM', 'FABHOMES'));
        $this->mockFallback = new MockSmsDriver();
    }

    public function sendSms(string $to, string $message): array
    {
        // If credentials are not configured, smoothly use the mock sandbox driver
        if (empty($this->username) || empty($this->apiKey) || app()->environment('testing')) {
            return $this->mockFallback->sendSms($to, $message);
        }

        try {
            $endpoint = $this->username === 'sandbox'
                ? 'https://api.sandbox.africastalking.com/version1/messaging'
                : 'https://api.africastalking.com/version1/messaging';

            $response = Http::withHeaders([
                'apiKey' => $this->apiKey,
                'Content-Type' => 'application/x-www-form-urlencoded',
                'Accept' => 'application/json',
            ])->asForm()->post($endpoint, [
                'username' => $this->username,
                'to' => $to,
                'message' => $message,
                'from' => $this->fromSender,
            ]);

            if ($response->successful()) {
                $body = $response->json();
                $recipientData = $body['SMSMessageData']['Recipients'][0] ?? null;

                if ($recipientData && in_array($recipientData['status'], ['Success', 'Sent'])) {
                    return [
                        'success' => true,
                        'gateway_provider' => 'africas_talking',
                        'message_id' => $recipientData['messageId'] ?? ('AT-' . Str::random(10)),
                        'cost_ugx' => floatval(str_replace('UGX ', '', $recipientData['cost'] ?? '45.00')),
                        'error' => null,
                        'raw' => $body,
                    ];
                }

                return [
                    'success' => false,
                    'gateway_provider' => 'africas_talking',
                    'message_id' => null,
                    'cost_ugx' => 0.00,
                    'error' => $recipientData['status'] ?? 'Recipient rejected by gateway',
                    'raw' => $body,
                ];
            }

            Log::error('AfricasTalking SMS dispatch failed', ['status' => $response->status(), 'body' => $response->body()]);

            return [
                'success' => false,
                'gateway_provider' => 'africas_talking',
                'message_id' => null,
                'cost_ugx' => 0.00,
                'error' => 'HTTP ' . $response->status() . ': ' . $response->body(),
                'raw' => $response->json() ?? [],
            ];
        } catch (\Throwable $e) {
            Log::error('AfricasTalking Exception', ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'gateway_provider' => 'africas_talking',
                'message_id' => null,
                'cost_ugx' => 0.00,
                'error' => $e->getMessage(),
                'raw' => [],
            ];
        }
    }
}
