<?php

namespace App\Services\Notifications\Contracts;

interface WhatsAppDriverInterface
{
    /**
     * Send an approved WhatsApp Cloud API Template message
     *
     * @param string $to Recipient international phone number (e.g. 256770123456)
     * @param string $templateName Name of pre-approved Meta template
     * @param array $parameters Dynamic body parameters (e.g. ['amount' => '3,500,000 UGX'])
     * @param array $buttons Optional quick-reply or URL buttons
     * @return array [success => bool, message_id => string|null, error => string|null, raw => array]
     */
    public function sendTemplateMessage(string $to, string $templateName, array $parameters = [], array $buttons = []): array;

    /**
     * Send plain text WhatsApp message (within 24-hr customer service window)
     */
    public function sendTextMessage(string $to, string $message): array;

    /**
     * Send interactive button message (within 24-hr window)
     */
    public function sendInteractiveButtons(string $to, string $bodyText, array $buttons, ?string $header = null, ?string $footer = null): array;
}
