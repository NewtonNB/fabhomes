<?php

namespace App\Services\Notifications\Drivers;

use App\Services\Notifications\Contracts\WhatsAppDriverInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaWhatsAppCloudDriver implements WhatsAppDriverInterface
{
    protected ?string $accessToken;
    protected ?string $phoneNumberId;
    protected ?string $apiVersion;
    protected MockWhatsAppDriver $mockFallback;

    public function __construct()
    {
        $this->accessToken = config('services.whatsapp.access_token', env('WHATSAPP_ACCESS_TOKEN'));
        $this->phoneNumberId = config('services.whatsapp.phone_number_id', env('WHATSAPP_PHONE_NUMBER_ID'));
        $this->apiVersion = config('services.whatsapp.api_version', env('WHATSAPP_API_VERSION', 'v21.0'));
        $this->mockFallback = new MockWhatsAppDriver();
    }

    public function sendTemplateMessage(string $to, string $templateName, array $parameters = [], array $buttons = []): array
    {
        if (empty($this->accessToken) || empty($this->phoneNumberId) || app()->environment('testing')) {
            return $this->mockFallback->sendTemplateMessage($to, $templateName, $parameters, $buttons);
        }

        $cleanPhone = preg_replace('/[^\d]/', '', $to);
        $endpoint = "https://graph.facebook.com/{$this->apiVersion}/{$this->phoneNumberId}/messages";

        // Build Meta template components
        $components = [];

        // Body parameters
        if (!empty($parameters)) {
            $bodyParams = [];
            foreach ($parameters as $param) {
                $bodyParams[] = [
                    'type' => 'text',
                    'text' => (string) $param,
                ];
            }
            $components[] = [
                'type' => 'body',
                'parameters' => $bodyParams,
            ];
        }

        // Button components
        if (!empty($buttons)) {
            foreach ($buttons as $idx => $btn) {
                $components[] = [
                    'type' => 'button',
                    'sub_type' => $btn['sub_type'] ?? 'quick_reply',
                    'index' => (string) $idx,
                    'parameters' => [
                        [
                            'type' => 'payload',
                            'payload' => $btn['payload'] ?? 'BUTTON_CLICK',
                        ],
                    ],
                ];
            }
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $cleanPhone,
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => ['code' => 'en'],
                'components' => $components,
            ],
        ];

        try {
            $response = Http::withToken($this->accessToken)
                ->timeout(10)
                ->post($endpoint, $payload);

            if ($response->successful()) {
                $body = $response->json();
                $messageId = $body['messages'][0]['id'] ?? null;

                return [
                    'success' => true,
                    'gateway_provider' => 'meta_whatsapp_cloud',
                    'message_id' => $messageId,
                    'error' => null,
                    'raw' => $body,
                ];
            }

            Log::error('Meta WhatsApp Cloud API error', ['status' => $response->status(), 'body' => $response->body()]);

            return [
                'success' => false,
                'gateway_provider' => 'meta_whatsapp_cloud',
                'message_id' => null,
                'error' => $response->json()['error']['message'] ?? 'Meta API error: ' . $response->status(),
                'raw' => $response->json() ?? [],
            ];
        } catch (\Throwable $e) {
            Log::error('Meta WhatsApp dispatch exception', ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'gateway_provider' => 'meta_whatsapp_cloud',
                'message_id' => null,
                'error' => $e->getMessage(),
                'raw' => [],
            ];
        }
    }

    public function sendTextMessage(string $to, string $message): array
    {
        if (empty($this->accessToken) || empty($this->phoneNumberId) || app()->environment('testing')) {
            return $this->mockFallback->sendTextMessage($to, $message);
        }

        $cleanPhone = preg_replace('/[^\d]/', '', $to);
        $endpoint = "https://graph.facebook.com/{$this->apiVersion}/{$this->phoneNumberId}/messages";

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $cleanPhone,
            'type' => 'text',
            'text' => [
                'preview_url' => true,
                'body' => $message,
            ],
        ];

        try {
            $response = Http::withToken($this->accessToken)
                ->timeout(10)
                ->post($endpoint, $payload);

            if ($response->successful()) {
                $body = $response->json();
                return [
                    'success' => true,
                    'gateway_provider' => 'meta_whatsapp_cloud',
                    'message_id' => $body['messages'][0]['id'] ?? null,
                    'error' => null,
                    'raw' => $body,
                ];
            }

            return [
                'success' => false,
                'gateway_provider' => 'meta_whatsapp_cloud',
                'message_id' => null,
                'error' => $response->json()['error']['message'] ?? 'Failed to send WhatsApp text',
                'raw' => $response->json() ?? [],
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'gateway_provider' => 'meta_whatsapp_cloud',
                'message_id' => null,
                'error' => $e->getMessage(),
                'raw' => [],
            ];
        }
    }

    public function sendInteractiveButtons(string $to, string $bodyText, array $buttons, ?string $header = null, ?string $footer = null): array
    {
        if (empty($this->accessToken) || empty($this->phoneNumberId) || app()->environment('testing')) {
            return $this->mockFallback->sendInteractiveButtons($to, $bodyText, $buttons, $header, $footer);
        }

        $cleanPhone = preg_replace('/[^\d]/', '', $to);
        $endpoint = "https://graph.facebook.com/{$this->apiVersion}/{$this->phoneNumberId}/messages";

        $actionButtons = [];
        foreach ($buttons as $btn) {
            $actionButtons[] = [
                'type' => 'reply',
                'reply' => [
                    'id' => $btn['id'],
                    'title' => substr($btn['title'], 0, 20), // Meta 20-char button limit
                ],
            ];
        }

        $interactive = [
            'type' => 'button',
            'body' => ['text' => $bodyText],
            'action' => ['buttons' => $actionButtons],
        ];

        if (!empty($header)) {
            $interactive['header'] = ['type' => 'text', 'text' => $header];
        }

        if (!empty($footer)) {
            $interactive['footer'] = ['text' => $footer];
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $cleanPhone,
            'type' => 'interactive',
            'interactive' => $interactive,
        ];

        try {
            $response = Http::withToken($this->accessToken)
                ->timeout(10)
                ->post($endpoint, $payload);

            if ($response->successful()) {
                $body = $response->json();
                return [
                    'success' => true,
                    'gateway_provider' => 'meta_whatsapp_cloud',
                    'message_id' => $body['messages'][0]['id'] ?? null,
                    'error' => null,
                    'raw' => $body,
                ];
            }

            return [
                'success' => false,
                'gateway_provider' => 'meta_whatsapp_cloud',
                'message_id' => null,
                'error' => $response->json()['error']['message'] ?? 'Failed to send interactive WhatsApp message',
                'raw' => $response->json() ?? [],
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'gateway_provider' => 'meta_whatsapp_cloud',
                'message_id' => null,
                'error' => $e->getMessage(),
                'raw' => [],
            ];
        }
    }
}
