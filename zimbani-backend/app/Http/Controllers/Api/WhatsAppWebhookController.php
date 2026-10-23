<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WhatsAppMessage;
use App\Models\WhatsAppWebhookLog;
use App\Services\Notifications\WhatsAppWebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class WhatsAppWebhookController extends Controller
{
    protected WhatsAppWebhookService $webhookService;

    public function __construct(WhatsAppWebhookService $webhookService)
    {
        $this->webhookService = $webhookService;
    }

    /**
     * Meta Webhook Verification Challenge (GET)
     */
    public function verify(Request $request): Response
    {
        $challenge = $this->webhookService->verifyChallenge($request);

        if ($challenge !== null) {
            return response($challenge, 200)->header('Content-Type', 'text/plain');
        }

        return response('Forbidden', 403);
    }

    /**
     * Meta Webhook Ingestion & Cryptographic Verification (POST)
     */
    public function handle(Request $request): JsonResponse
    {
        $rawContent = $request->getContent();
        $signature = $request->header('X-Hub-Signature-256');

        $isSignatureValid = $this->webhookService->verifySignature($rawContent, $signature);

        if (!$isSignatureValid && !app()->environment('testing')) {
            return response()->json([
                'error' => 'Cryptographic signature mismatch',
            ], 403);
        }

        $payload = $request->json()->all();
        $result = $this->webhookService->processWebhook($payload, $isSignatureValid);

        return response()->json([
            'status' => 'success',
            'data' => $result,
        ], 200);
    }

    /**
     * Send Outbound WhatsApp Template (Authenticated)
     */
    public function sendTemplate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'to' => 'required|string',
            'template_name' => 'required|string',
            'parameters' => 'nullable|array',
            'buttons' => 'nullable|array',
        ]);

        $message = $this->webhookService->dispatchTemplate(
            $validated['to'],
            $validated['template_name'],
            $validated['parameters'] ?? [],
            $validated['buttons'] ?? [],
            $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => 'WhatsApp template message dispatched',
            'data' => $message,
        ], 201);
    }

    /**
     * Get WhatsApp Messages History (Authenticated)
     */
    public function getMessages(Request $request): JsonResponse
    {
        $phone = $request->query('phone');
        $query = WhatsAppMessage::orderBy('created_at', 'asc');

        if (!empty($phone)) {
            $clean = preg_replace('/[^\d]/', '', $phone);
            $query->where('phone_number', 'LIKE', "%{$clean}%");
        } else {
            $query->where('user_id', $request->user()->id);
        }

        $messages = $query->limit(50)->get();

        return response()->json([
            'success' => true,
            'data' => $messages,
        ]);
    }

    /**
     * Get Ingested Webhooks Log (Authenticated)
     */
    public function getWebhookLogs(Request $request): JsonResponse
    {
        $logs = WhatsAppWebhookLog::orderBy('created_at', 'desc')->paginate(25);

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }
}
