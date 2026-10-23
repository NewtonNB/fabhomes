<?php

namespace App\Services\Notifications\Drivers;

use App\Services\Notifications\Contracts\WhatsAppDriverInterface;
use Illuminate\Support\Str;

class MockWhatsAppDriver implements WhatsAppDriverInterface
{
    public function sendTemplateMessage(string $to, string $templateName, array $parameters = [], array $buttons = []): array
    {
        $cleanPhone = preg_replace('/[^\d]/', '', $to);

        if (str_contains($cleanPhone, '000000')) {
            return [
                'success' => false,
                'gateway_provider' => 'mock_whatsapp_cloud',
                'message_id' => null,
                'error' => 'Recipient phone number is not a valid WhatsApp user account',
                'raw' => ['error' => ['message' => 'Invalid parameter', 'code' => 100]],
            ];
        }

        $wamid = 'wamid.HBg' . Str::random(32) . '=';

        return [
            'success' => true,
            'gateway_provider' => 'mock_whatsapp_cloud',
            'message_id' => $wamid,
            'error' => null,
            'raw' => [
                'messaging_product' => 'whatsapp',
                'contacts' => [
                    [
                        'input' => $to,
                        'wa_id' => $cleanPhone,
                    ],
                ],
                'messages' => [
                    [
                        'id' => $wamid,
                        'message_status' => 'accepted',
                    ],
                ],
                'template_name' => $templateName,
                'parameters' => $parameters,
            ],
        ];
    }

    public function sendTextMessage(string $to, string $message): array
    {
        $cleanPhone = preg_replace('/[^\d]/', '', $to);
        $wamid = 'wamid.HBg' . Str::random(32) . '=';

        return [
            'success' => true,
            'gateway_provider' => 'mock_whatsapp_cloud',
            'message_id' => $wamid,
            'error' => null,
            'raw' => [
                'messaging_product' => 'whatsapp',
                'contacts' => [['input' => $to, 'wa_id' => $cleanPhone]],
                'messages' => [['id' => $wamid, 'message_status' => 'accepted']],
                'text' => ['body' => $message],
            ],
        ];
    }

    public function sendInteractiveButtons(string $to, string $bodyText, array $buttons, ?string $header = null, ?string $footer = null): array
    {
        $cleanPhone = preg_replace('/[^\d]/', '', $to);
        $wamid = 'wamid.HBg' . Str::random(32) . '=';

        return [
            'success' => true,
            'gateway_provider' => 'mock_whatsapp_cloud',
            'message_id' => $wamid,
            'error' => null,
            'raw' => [
                'messaging_product' => 'whatsapp',
                'contacts' => [['input' => $to, 'wa_id' => $cleanPhone]],
                'messages' => [['id' => $wamid, 'message_status' => 'accepted']],
                'interactive' => [
                    'type' => 'button',
                    'header' => $header ? ['type' => 'text', 'text' => $header] : null,
                    'body' => ['text' => $bodyText],
                    'footer' => $footer ? ['text' => $footer] : null,
                    'action' => ['buttons' => $buttons],
                ],
            ],
        ];
    }
}
