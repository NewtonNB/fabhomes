<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MobileMoneyGateway;
use App\Models\MobileMoneyTransaction;
use App\Models\PaymentWebhookLog;
use App\Services\MobileMoneyGatewayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class MobileMoneyController extends Controller
{
    protected MobileMoneyGatewayService $mmService;

    public function __construct(MobileMoneyGatewayService $mmService)
    {
        $this->mmService = $mmService;
    }

    /**
     * Get statistics on Mobile Money operations.
     */
    public function statistics(): JsonResponse
    {
        $stats = $this->mmService->getTransactionStatistics();

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * List mobile money transactions with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = MobileMoneyTransaction::with([
            'client:id,name,phone_number',
            'savingsAccount:id,account_number,account_type',
            'milestonePool:id,milestone_name,tier_order',
            'payment:id,payment_number,amount',
            'initiatedByUser:id,name',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('provider')) {
            $query->where('provider', $request->provider);
        }

        if ($request->filled('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        if ($request->filled('purpose')) {
            $query->where('purpose', $request->purpose);
        }

        if ($request->filled('phone_number')) {
            $query->where('phone_number', 'LIKE', "%{$request->phone_number}%");
        }

        if ($request->filled('savings_account_id')) {
            $query->where('savings_account_id', $request->savings_account_id);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('transaction_reference', 'LIKE', "%{$s}%")
                    ->orWhere('external_reference', 'LIKE', "%{$s}%")
                    ->orWhere('phone_number', 'LIKE', "%{$s}%")
                    ->orWhere('payer_or_payee_name', 'LIKE', "%{$s}%");
            });
        }

        $transactions = $query->latest()->paginate($request->input('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $transactions,
        ]);
    }

    /**
     * Get details of a single mobile money transaction.
     */
    public function show(string $uuid): JsonResponse
    {
        $tx = MobileMoneyTransaction::where('uuid', $uuid)
            ->with([
                'client',
                'savingsAccount',
                'milestonePool',
                'payment',
                'paymentCertificate',
                'pettyCashAccount',
                'ledgerTransaction',
                'webhookLogs',
                'initiatedByUser:id,name,email',
            ])
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $tx,
        ]);
    }

    /**
     * Initiate an STK Push (C2B Collection) request to client handset.
     */
    public function initiateStkPush(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone_number' => 'required|string|min:9|max:20',
            'amount' => 'required|numeric|min:500', // Min 500 UGX
            'currency' => 'nullable|string|size:3',
            'provider' => 'nullable|string|in:mtn_momo,airtel_money,mock_gateway',
            'client_id' => 'nullable|integer|exists:clients,id',
            'savings_account_id' => 'nullable|integer|exists:savings_accounts,id',
            'milestone_savings_pool_id' => 'nullable|integer|exists:milestone_savings_pools,id',
            'payer_name' => 'nullable|string|max:255',
            'purpose' => 'nullable|string|in:savings_deposit,contractor_payout,petty_cash_topup,casual_wages,client_refund',
            'notes' => 'nullable|string',
        ]);

        try {
            $tx = $this->mmService->initiateStkPushCollection($validated, $request->user());

            return response()->json([
                'success' => true,
                'message' => "STK Push dispatched to {$tx->phone_number}. Prompt sent to customer handset.",
                'data' => $tx,
            ], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Initiate an automated B2C Mobile Money disbursement (contractor, worker, petty cash).
     */
    public function disburse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone_number' => 'required|string|min:9|max:20',
            'payee_name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:500',
            'currency' => 'nullable|string|size:3',
            'provider' => 'nullable|string|in:mtn_momo,airtel_money,mock_gateway',
            'purpose' => 'required|string|in:contractor_payout,petty_cash_topup,casual_wages,client_refund,retention_release',
            'payment_certificate_id' => 'nullable|integer|exists:payment_certificates,id',
            'milestone_payment_release_id' => 'nullable|integer|exists:milestone_payment_releases,id',
            'petty_cash_account_id' => 'nullable|integer|exists:petty_cash_accounts,id',
        ]);

        try {
            $tx = $this->mmService->initiateB2cDisbursement($validated, $request->user());

            return response()->json([
                'success' => true,
                'message' => "Disbursement of {$tx->amount} {$tx->currency} sent successfully to {$tx->phone_number}.",
                'data' => $tx,
            ], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Handle incoming Instant Payment Notification (IPN) webhook from gateway providers.
     */
    public function handleWebhook(Request $request, string $provider): JsonResponse
    {
        $payload = $request->all();
        $headers = $request->headers->all();
        $ip = $request->ip();

        $result = $this->mmService->processIncomingWebhook($provider, $payload, $headers, $ip);

        return response()->json([
            'received' => true,
            'result' => $result,
        ]);
    }

    /**
     * Development / Staging simulator for testing STK push completions and callbacks.
     */
    public function simulateCallback(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'transaction_reference' => 'required|string',
            'status' => 'required|string|in:SUCCESSFUL,FAILED',
            'failure_reason' => 'nullable|string',
        ]);

        $result = $this->mmService->simulateWebhookCallback(
            $validated['transaction_reference'],
            $validated['status'],
            $validated['failure_reason'] ?? null
        );

        return response()->json([
            'success' => true,
            'message' => "Simulated callback executed for {$validated['transaction_reference']}.",
            'data' => $result,
        ]);
    }

    /**
     * List webhook logs for auditing.
     */
    public function webhookLogs(Request $request): JsonResponse
    {
        $query = PaymentWebhookLog::with('mobileMoneyTransaction:id,transaction_reference,amount,phone_number');

        if ($request->filled('provider')) {
            $query->where('provider', $request->provider);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $logs = $query->latest()->paginate($request->input('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * List configured mobile money gateways.
     */
    public function gateways(): JsonResponse
    {
        $gateways = MobileMoneyGateway::all();

        return response()->json([
            'success' => true,
            'data' => $gateways,
        ]);
    }
}
