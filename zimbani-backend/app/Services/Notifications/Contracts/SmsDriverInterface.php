<?php

namespace App\Services\Notifications\Contracts;

interface SmsDriverInterface
{
    /**
     * Send an SMS message to a mobile number
     *
     * @param string $to Recipient phone number (e.g. +256700123456)
     * @param string $message Text content
     * @return array [success => bool, message_id => string|null, cost_ugx => float, error => string|null, raw => array]
     */
    public function sendSms(string $to, string $message): array;
}
