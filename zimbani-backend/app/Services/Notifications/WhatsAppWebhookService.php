<?php

namespace App\Services\Notifications;

use App\Models\Client;
use App\Models\NotificationDispatchLog;
use App\Models\SavingsAccount;
use App\Models\User;
use App\Models\WhatsAppMessage;
use App\Models\WhatsAppWebhookLog;
use App\Services\Notifications\Contracts\WhatsAppDriverInterface;
use App\Services\Notifications\Drivers\MetaWhatsAppCloudDriver;
use App\Services\Notifications\Drivers\MockWhatsAppDriver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WhatsAppWebhookService
{
    protected string $verifyToken;
    protected string $appSecret;
    protected WhatsAppDriverInterface $driver;

    public function __construct(?WhatsAppDriverInterface $driver = null)
    {
        $this->verifyToken = config('services.whatsapp.verify_token', env('WHATSAPP_VERIFY_TOKEN', 'fab_homes_meta_token_2026'));
        $this->appSecret = config('services.whatsapp.app_secret', env('WHATSAPP_APP_SECRET', 'fab_meta_secret_2026'));
        $this->driver = $driver ?? (
            app()->environment('testing')
                ? new MockWhatsAppDriver()
                : new MetaWhatsAppCloudDriver()
        );
    }

    /**
     * Verify Meta Webhook subscription challenge (GET)
     */
    public function verifyChallenge(Request $request): ?string
    {
        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        if ($mode === 'subscribe' && $token === $this->verifyToken) {
            return $challenge;
        }

        return null;
    }

    /**
     * Verify HMAC-SHA256 signature from Meta (POST)
     */
    public function verifySignature(string $rawContent, ?string $signatureHeader): bool
    {
        // Allow in test environment if test header provided
        if (app()->environment('testing') && $signatureHeader === 'sha256=test_valid_mock_signature') {
            return true;
        }

        if (empty($signatureHeader) || !str_starts_with($signatureHeader, 'sha256=')) {
            return false;
        }

        $expectedHash = hash_hmac('sha256', $rawContent, $this->appSecret);
        $providedHash = substr($signatureHeader, 7);

        return hash_equals($expectedHash, $providedHash);
    }

    /**
     * Process incoming webhook payload
     */
    public function processWebhook(array $payload, bool $isSignatureValid = true): array
    {
        $eventType = 'unknown';
        $senderPhone = null;

        // Detect event type from payload
        if (isset($payload['entry'][0]['changes'][0]['value']['messages'])) {
            $eventType = 'messages';
            $senderPhone = $payload['entry'][0]['changes'][0]['value']['messages'][0]['from'] ?? null;
        } elseif (isset($payload['entry'][0]['changes'][0]['value']['statuses'])) {
            $eventType = 'message_status';
            $senderPhone = $payload['entry'][0]['changes'][0]['value']['statuses'][0]['recipient_id'] ?? null;
        }

        // 1. Audit log the incoming webhook
        $webhookLog = WhatsAppWebhookLog::create([
            'event_type' => $eventType,
            'sender_phone' => $senderPhone,
            'payload' => $payload,
            'signature_valid' => $isSignatureValid,
            'processed' => false,
        ]);

        if (!$isSignatureValid) {
            $webhookLog->update(['error' => 'Cryptographic signature mismatch']);
            return ['status' => 'rejected', 'error' => 'Invalid signature'];
        }

        try {
            $value = $payload['entry'][0]['changes'][0]['value'] ?? [];

            // A. Handle Delivery Status Receipts
            if (!empty($value['statuses'])) {
                $this->handleStatusUpdates($value['statuses']);
            }

            // B. Handle Inbound Messages & Quick Replies
            if (!empty($value['messages'])) {
                $this->handleInboundMessages($value['messages']);
            }

            $webhookLog->update(['processed' => true]);

            return ['status' => 'processed', 'event_type' => $eventType];
        } catch (\Throwable $e) {
            Log::error('WhatsApp webhook processing error', ['error' => $e->getMessage()]);
            $webhookLog->update(['error' => $e->getMessage()]);

            return ['status' => 'error', 'error' => $e->getMessage()];
        }
    }

    /**
     * Handle Status Updates (sent, delivered, read, failed)
     */
    protected function handleStatusUpdates(array $statuses): void
    {
        foreach ($statuses as $st) {
            $wamid = $st['id'] ?? null;
            $statusName = $st['status'] ?? null; // delivered, read, failed, sent
            $timestamp = isset($st['timestamp']) ? date('Y-m-d H:i:s', intval($st['timestamp'])) : now();

            if (!$wamid) continue;

            $message = WhatsAppMessage::where('wa_message_id', $wamid)->first();
            if ($message) {
                $updateData = ['status' => $statusName];
                if ($statusName === 'delivered') $updateData['delivered_at'] = $timestamp;
                if ($statusName === 'read') $updateData['read_at'] = $timestamp;
                if ($statusName === 'failed') {
                    $updateData['error_message'] = $st['errors'][0]['message'] ?? 'Delivery failed';
                }
                $message->update($updateData);
            }

            // Also synchronize notification dispatch logs
            $dispatchLog = NotificationDispatchLog::where('gateway_message_id', $wamid)->first();
            if ($dispatchLog) {
                $dispatchLog->update([
                    'status' => in_array($statusName, ['delivered', 'read']) ? 'delivered' : ($statusName === 'failed' ? 'failed' : 'dispatched'),
                    'response_payload' => $st,
                ]);
            }
        }
    }

    /**
     * Handle Inbound WhatsApp Messages & Quick Replies
     */
    protected function handleInboundMessages(array $messages): void
    {
        foreach ($messages as $msg) {
            $from = $msg['from'] ?? '';
            $wamid = $msg['id'] ?? ('wamid.IN.' . Str::random(16));
            $type = $msg['type'] ?? 'text';

            // Resolve User and Client by phone number
            $cleanPhone = preg_replace('/[^\d]/', '', $from);
            $client = Client::whereRaw("REPLACE(REPLACE(phone_primary, '+', ''), ' ', '') LIKE ?", ["%{$cleanPhone}%"])
                ->orWhereRaw("REPLACE(REPLACE(phone_secondary, '+', ''), ' ', '') LIKE ?", ["%{$cleanPhone}%"])
                ->first();

            $user = $client ? User::find($client->user_id) : User::whereRaw("REPLACE(REPLACE(phone, '+', ''), ' ', '') LIKE ?", ["%{$cleanPhone}%"])->first();

            $bodyText = '';
            $messageType = 'text';

            if ($type === 'text') {
                $bodyText = $msg['text']['body'] ?? '';
                $messageType = 'text';
            } elseif ($type === 'interactive' && isset($msg['interactive']['button_reply'])) {
                $bodyText = $msg['interactive']['button_reply']['id'] ?? '';
                $messageType = 'button_reply';
            } elseif ($type === 'button') {
                $bodyText = $msg['button']['text'] ?? '';
                $messageType = 'button_reply';
            }

            // Save inbound message
            WhatsAppMessage::create([
                'user_id' => $user?->id,
                'client_id' => $client?->id,
                'direction' => 'inbound',
                'wa_message_id' => $wamid,
                'phone_number' => $from,
                'message_type' => $messageType,
                'body' => $bodyText,
                'payload' => $msg,
                'status' => 'delivered',
                'delivered_at' => now(),
            ]);

            // Execute automated contextual replies
            $this->executeInboundAction($from, $bodyText, $user, $client);
        }
    }

    /**
     * Send and log an outbound text soft reply
     */
    public function sendDirectReply(string $to, string $message, ?User $user = null, ?Client $client = null): WhatsAppMessage
    {
        $cleanPhone = preg_replace('/[^\d]/', '', $to);

        $res = $this->driver->sendTextMessage($cleanPhone, $message);

        return WhatsAppMessage::create([
            'user_id' => $user?->id,
            'client_id' => $client?->id,
            'direction' => 'outbound',
            'wa_message_id' => $res['message_id'] ?? ('wamid.OUT.' . Str::random(16)),
            'phone_number' => $cleanPhone,
            'message_type' => 'text',
            'body' => $message,
            'payload' => $res['raw'] ?? [],
            'status' => $res['success'] ? 'delivered' : 'failed',
            'error_message' => $res['error'] ?? null,
            'delivered_at' => $res['success'] ? now() : null,
        ]);
    }

    /**
     * Automated Contextual Action & Soft Replies Engine
     */
    protected function executeInboundAction(string $fromPhone, string $text, ?User $user, ?Client $client): void
    {
        $command = strtoupper(trim($text));
        $clientName = $client?->full_name ?? $user?->name ?? 'Valued Client';

        // 1. Soft Greetings & Welcome
        if (
            $command === 'HI' || $command === 'HELLO' || $command === 'HEY' ||
            str_starts_with($command, 'HELLO') || str_starts_with($command, 'HI ') ||
            str_contains($command, 'HABARI') || str_contains($command, 'JAMBO') ||
            str_contains($command, 'GOOD MORNING') || str_contains($command, 'GOOD AFTERNOON') ||
            str_contains($command, 'GOOD EVENING') || str_contains($command, 'OLI OTYA') ||
            str_contains($command, 'MAMBO')
        ) {
            $reply = "Hello {$clientName}! Welcome to Fab Homes Uganda.\n\nWe are delighted to assist you with your land and homeownership journey. How can we help you today?\n\nQuick soft options:\n- *BALANCE*: Check active savings & payments\n- *PLOTS*: View your plot allocations & deeds\n- *RECEIPT*: Check recent transaction receipts\n- *HELP*: Speak with an estate relationship manager.";
            $this->sendDirectReply($fromPhone, $reply, $user, $client);
            return;
        }

        // 2. Soft Appreciation & Gratitude
        if (
            $command === 'THANK YOU' || $command === 'THANKS' || $command === 'THX' ||
            str_contains($command, 'THANK') || str_contains($command, 'ASANTE') ||
            str_contains($command, 'WEBALE') || $command === 'OK' || $command === 'ALRIGHT' ||
            $command === 'COOL' || $command === 'GREAT' || $command === 'PERFECT'
        ) {
            $reply = "You're most welcome, {$clientName}! It is always our pleasure serving you. Let us know whenever you need further assistance. Have a wonderful day!";
            $this->sendDirectReply($fromPhone, $reply, $user, $client);
            return;
        }

        // 3. Balance Inquiry: "BALANCE"
        if ($command === 'BALANCE' || str_contains($command, 'CHECK BALANCE')) {
            if ($client) {
                $accounts = SavingsAccount::where('client_id', $client->id)->get();

                $totalBalance = $accounts->sum('current_balance');
                $formattedBal = number_format($totalBalance, 0) . ' UGX';

                $reply = "Fab Homes Concierge:\n\nYour active savings balance across " . $accounts->count() . " account(s) is: *{$formattedBal}*.\n\nType *DEEDS* for title status, *RECEIPT* for payment confirmation, or *HELP* for support.";
                $this->sendDirectReply($fromPhone, $reply, $user, $client);
            } else {
                $reply = "Fab Homes: Your WhatsApp number is not yet linked to an active client portal account. Visit https://fabhomes.ug to link your account.";
                $this->sendDirectReply($fromPhone, $reply, $user, $client);
            }
            return;
        }

        // 4. Receipt & Payment Confirmation: "RECEIPT", "PAYMENT"
        if (
            str_contains($command, 'RECEIPT') || str_contains($command, 'PAYMENT') ||
            str_contains($command, 'DEPOSIT') || str_contains($command, 'PAID') ||
            str_contains($command, 'MTN') || str_contains($command, 'AIRTEL')
        ) {
            $reply = "Fab Homes Accounts Desk:\n\nAll verified deposits automatically generate an official sealed receipt with barcode validation in your Client Vault: https://portal.fabhomes.ug/client-portal?tab=vault\n\nTo view your running ledger balance, reply *BALANCE*. For payment confirmation, reply *HELP*.";
            $this->sendDirectReply($fromPhone, $reply, $user, $client);
            return;
        }

        // 5. Plots & Title Deeds: "PLOT", "DEEDS", "TITLE"
        if (
            str_contains($command, 'PLOT') || str_contains($command, 'DEED') ||
            str_contains($command, 'TITLE') || str_contains($command, 'LAND') ||
            str_contains($command, 'ESTATE') || str_contains($command, 'SITE')
        ) {
            $reply = "Fab Homes Land Registry Desk:\n\nYour allocated plots, survey boundary coordinates, and deed records are accessible in real-time on your Interactive Estate Portal: https://portal.fabhomes.ug/client-portal?tab=deeds\n\nTo schedule a physical site visit, reply *HELP*.";
            $this->sendDirectReply($fromPhone, $reply, $user, $client);
            return;
        }

        // 6. Construction Milestones & Inspection: "MILESTONE", "CONSTRUCTION"
        if (
            str_contains($command, 'MILESTONE') || str_contains($command, 'BUILD') ||
            str_contains($command, 'CONSTRUCTION') || str_contains($command, 'INSPECTION') ||
            str_contains($command, 'PROGRESS') || str_contains($command, 'BOQ')
        ) {
            $reply = "Fab Homes Engineering Desk:\n\nOur site engineers inspect and verify construction milestones continuously. You can review photo walkthroughs, BoQ compliance, and authorize releases with your Quick-PIN at: https://portal.fabhomes.ug/client-portal?tab=milestones";
            $this->sendDirectReply($fromPhone, $reply, $user, $client);
            return;
        }

        // 7. Interactive Button Reply: "VIEW_LEDGER"
        if ($command === 'VIEW_LEDGER' || str_contains($command, 'LEDGER') || str_contains($command, 'STATEMENT')) {
            $reply = "Fab Homes: You can view and download your full printable running-balance statement directly at: https://portal.fabhomes.ug/client-portal?tab=vault";
            $this->sendDirectReply($fromPhone, $reply, $user, $client);
            return;
        }

        // 8. Interactive Button Reply: "APPROVE_MILESTONE"
        if (str_starts_with($command, 'APPROVE_MILESTONE') || $command === 'APPROVE') {
            $reply = "Fab Homes Security: For your protection, milestone fund releases require cryptographic verification with your 4-digit Quick-PIN. Please open your Fab Homes App to sign off: https://portal.fabhomes.ug/client-portal?tab=milestones";
            $this->sendDirectReply($fromPhone, $reply, $user, $client);
            return;
        }

        // 9. Help & Support
        if ($command === 'HELP' || $command === 'SUPPORT' || str_contains($command, 'CONTACT') || str_contains($command, 'HOTLINE') || $command === 'CALL') {
            $reply = "Fab Homes Concierge WhatsApp Assistant:\n\nAvailable commands:\n- *BALANCE*: Check active savings balance\n- *PLOTS*: View your plot allocations & deeds\n- *RECEIPT*: Check recent deposit receipts\n- *LEDGER*: View official financial statement\n- *HELP*: Customer support hotline\n\nCall our estate desk at +256 312 000 000 or email support@fabhomes.ug.";
            $this->sendDirectReply($fromPhone, $reply, $user, $client);
            return;
        }

        // 10. Graceful Soft Fallback (Polite assistant response, no dead ends)
        $snippet = Str::limit($text, 35);
        $reply = "Thank you for reaching out to Fab Homes Uganda. We have received your inquiry (\"{$snippet}\").\n\nAn estate relationship manager has been notified and will assist you shortly.\n\nIn the meantime, you can reply *BALANCE* for your account summary or *HELP* to connect with our desk directly.";
        $this->sendDirectReply($fromPhone, $reply, $user, $client);
    }

    /**
     * Direct Outbound WhatsApp Template Dispatch
     */
    public function dispatchTemplate(
        string $to,
        string $templateName,
        array $parameters = [],
        array $buttons = [],
        ?User $user = null,
        ?Client $client = null
    ): WhatsAppMessage {
        $cleanPhone = preg_replace('/[^\d]/', '', $to);

        $res = $this->driver->sendTemplateMessage($cleanPhone, $templateName, $parameters, $buttons);

        return WhatsAppMessage::create([
            'user_id' => $user?->id,
            'client_id' => $client?->id,
            'direction' => 'outbound',
            'wa_message_id' => $res['message_id'] ?? null,
            'phone_number' => $cleanPhone,
            'message_type' => 'template',
            'template_name' => $templateName,
            'body' => "Template: {$templateName} - " . json_encode($parameters),
            'payload' => $res['raw'] ?? [],
            'status' => $res['success'] ? 'sent' : 'failed',
            'error_message' => $res['error'] ?? null,
            'sent_at' => $res['success'] ? now() : null,
        ]);
    }
}
