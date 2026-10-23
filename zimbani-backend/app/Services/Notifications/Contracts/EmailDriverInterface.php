<?php

namespace App\Services\Notifications\Contracts;

interface EmailDriverInterface
{
    /**
     * Send a branded HTML email to a recipient
     *
     * @param string $to Recipient email address
     * @param string $subject Subject line
     * @param string $bodyText Plain text summary
     * @param array $templateData Data payload for branded rendering
     * @return array [success => bool, message_id => string|null, error => string|null]
     */
    public function sendEmail(string $to, string $subject, string $bodyText, array $templateData = []): array;
}
