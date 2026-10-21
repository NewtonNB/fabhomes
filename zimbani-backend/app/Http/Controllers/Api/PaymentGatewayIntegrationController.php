<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentIntent;
use App\Services\PaymentProcessingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentGatewayIntegrationController extends Controller
{
    public function __construct(
        protected PaymentProcessingService $service
    ) {}

    /**
     * List active payment gateway configurations.
     */
    public function gateways(): JsonResponse
    {
        $this->service->seedInitialGateways();
        $gateways = $this->service->getGatewayConfigs();

        return response()->json([
            'success' => true,
            'data' => $gateways,
        ]);
    }

    /**
     * List payment intents with filtering and pagination.
     */
    public function intents(Request $request): JsonResponse
    {
        $filters = $request->only(['status', 'gateway_name', 'client_id']);
        $perPage = (int) $request->get('per_page', 15);

        $intents = $this->service->getPaymentIntents($filters, $perPage);

        return response()->json([
            'success' => true,
            'data' => $intents->items(),
            'meta' => [
                'current_page' => $intents->currentPage(),
                'last_page' => $intents->lastPage(),
                'per_page' => $intents->perPage(),
                'total' => $intents->total(),
            ],
        ]);
    }

    /**
     * Show single payment intent details.
     */
    public function showIntent(string $identifier): JsonResponse
    {
        $intent = PaymentIntent::with(['client', 'project', 'unit', 'savingsAccount', 'milestoneSavingsPool', 'payment'])
            ->where('uuid', $identifier)
            ->orWhere('id', $identifier)
            ->orWhere('intent_reference', $identifier)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $intent,
        ]);
    }

    /**
     * Create a new payment intent session.
     */
    public function createIntent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:500',
            'currency' => 'nullable|string|size:3',
            'gateway_name' => 'nullable|string|in:flutterwave,pesapal,mtn_momo,airtel_money,bank_transfer',
            'payment_method' => 'nullable|string|in:mobile_money,card,bank_transfer',
            'client_id' => 'nullable|exists:clients,id',
            'project_id' => 'nullable|exists:projects,id',
            'unit_id' => 'nullable|exists:units,id',
            'savings_account_id' => 'nullable|exists:savings_accounts,id',
            'milestone_savings_pool_id' => 'nullable|exists:milestone_savings_pools,id',
            'client_phone' => 'nullable|string|max:30',
            'client_email' => 'nullable|email|max:150',
            'client_name' => 'nullable|string|max:150',
            'metadata' => 'nullable|array',
        ]);

        $intent = $this->service->createPaymentIntent(
            $validated,
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'success' => true,
            'message' => 'Payment intent initialized successfully',
            'data' => $intent,
        ], 201);
    }

    /**
     * Confirm / execute payment intent settlement.
     */
    public function confirmIntent(Request $request, string $identifier): JsonResponse
    {
        $confirmed = $this->service->confirmPaymentIntent($identifier, $request->all());

        return response()->json([
            'success' => true,
            'message' => 'Payment verified and posted to escrow ledger successfully',
            'data' => $confirmed,
        ]);
    }

    /**
     * Cancel an active payment intent.
     */
    public function cancelIntent(Request $request, string $identifier): JsonResponse
    {
        $reason = $request->input('reason', 'Cancelled by user');
        $cancelled = $this->service->cancelPaymentIntent($identifier, $reason);

        return response()->json([
            'success' => true,
            'message' => 'Payment intent cancelled',
            'data' => $cancelled,
        ]);
    }

    /**
     * Public gateway webhook receiver.
     */
    public function handleWebhook(Request $request, string $gateway): JsonResponse
    {
        $result = $this->service->handleWebhook(
            $gateway,
            $request->all(),
            $request->headers->all()
        );

        return response()->json($result);
    }

    /**
     * Global payment processing statistics.
     */
    public function statistics(): JsonResponse
    {
        $stats = $this->service->getStatistics();

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
