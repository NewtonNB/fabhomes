<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentDispute;
use App\Models\PaymentRefund;
use App\Services\PaymentRefundDisputeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class PaymentRefundDisputeController extends Controller
{
    public function __construct(
        protected PaymentRefundDisputeService $service
    ) {}

    /**
     * Get aggregate statistics for refunds and disputes.
     */
    public function statistics(): JsonResponse
    {
        $stats = $this->service->getStatistics();

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * List refunds with pagination & filters.
     */
    public function refunds(Request $request): JsonResponse
    {
        $filters = $request->only(['status', 'reason_category', 'client_id', 'payment_id', 'search']);
        $perPage = (int) $request->get('per_page', 15);

        $refunds = $this->service->getRefunds($filters, $perPage);

        return response()->json([
            'success' => true,
            'data' => $refunds->items(),
            'meta' => [
                'current_page' => $refunds->currentPage(),
                'last_page' => $refunds->lastPage(),
                'per_page' => $refunds->perPage(),
                'total' => $refunds->total(),
            ],
        ]);
    }

    /**
     * Show single refund details.
     */
    public function showRefund(string $identifier): JsonResponse
    {
        $refund = PaymentRefund::with([
            'payment',
            'paymentIntent',
            'client',
            'savingsAccount',
            'reversalTransaction',
            'requestedByUser',
            'approvedByUser',
            'rejectedByUser',
            'disputes'
        ])
        ->where('id', $identifier)
        ->orWhere('uuid', $identifier)
        ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $refund,
        ]);
    }

    /**
     * Calculate refund deduction and balance according to manual rules.
     */
    public function calculateDeduction(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount_paid' => 'required|numeric|min:0',
            'requested_amount' => 'required|numeric|min:0',
            'deduction_percentage' => 'required|numeric|min:0|max:100',
        ]);

        $amountPaid = (float) $validated['amount_paid'];
        $requestedAmount = (float) $validated['requested_amount'];
        $deductionPct = (float) $validated['deduction_percentage'];

        $deductionAmount = round($requestedAmount * ($deductionPct / 100), 2);
        $netPayableToClient = max(0, round($requestedAmount - $deductionAmount, 2));
        $balanceAfterRefund = max(0, round($amountPaid - $requestedAmount, 2));

        return response()->json([
            'success' => true,
            'data' => [
                'amount_paid' => $amountPaid,
                'requested_amount' => $requestedAmount,
                'deduction_percentage' => $deductionPct,
                'deduction_amount' => $deductionAmount,
                'net_payable_to_client' => $netPayableToClient,
                'balance_after_refund' => $balanceAfterRefund,
            ],
        ]);
    }

    /**
     * Request a refund for a payment.
     */
    public function requestRefund(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_id' => 'required',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'nullable|string|size:3',
            'reason_category' => 'nullable|in:escrow_surplus,duplicate_payment,client_cancellation,milestone_variation,disputed_chargeback,other',
            'reason_description' => 'nullable|string|max:1000',
            'savings_account_id' => 'nullable|integer|exists:savings_accounts,id',
            'fee_refunded' => 'nullable|numeric|min:0',
            'phase_name' => 'nullable|string|max:100',
            'scheme_name' => 'nullable|string|max:100',
            'notice_date' => 'nullable|date',
            'deduction_percentage' => 'nullable|numeric|min:0|max:100',
            'deduction_amount' => 'nullable|numeric|min:0',
            'balance_after_refund' => 'nullable|numeric|min:0',
            'withdrawal_reason' => 'nullable|string|max:1000',
            'payment_method' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:1000',
            'metadata' => 'nullable|array',
        ]);

        try {
            $refund = $this->service->requestRefund($validated, auth()->id());

            return response()->json([
                'success' => true,
                'message' => 'Refund request successfully submitted for approval.',
                'data' => $refund,
            ], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to process refund request: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Approve a pending refund request.
     */
    public function approveRefund(Request $request, string $identifier): JsonResponse
    {
        $autoExecute = filter_var($request->input('auto_execute', true), FILTER_VALIDATE_BOOLEAN);

        try {
            $refund = $this->service->approveRefund($identifier, auth()->id(), $autoExecute);

            return response()->json([
                'success' => true,
                'message' => $autoExecute 
                    ? 'Refund approved and executed successfully with ledger reversal posted.'
                    : 'Refund approved. Ready for execution.',
                'data' => $refund,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Approval failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reject a pending refund request.
     */
    public function rejectRefund(Request $request, string $identifier): JsonResponse
    {
        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        try {
            $refund = $this->service->rejectRefund($identifier, $validated['rejection_reason'], auth()->id());

            return response()->json([
                'success' => true,
                'message' => 'Refund request rejected.',
                'data' => $refund,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Rejection failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Manually execute an approved refund.
     */
    public function executeRefund(string $identifier): JsonResponse
    {
        try {
            $refund = $this->service->executeRefund($identifier);

            return response()->json([
                'success' => true,
                'message' => 'Refund executed successfully and reversing debit posted.',
                'data' => $refund,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Execution failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * List disputes with pagination & filters.
     */
    public function disputes(Request $request): JsonResponse
    {
        $filters = $request->only(['status', 'dispute_source', 'client_id', 'payment_id', 'search']);
        $perPage = (int) $request->get('per_page', 15);

        $disputes = $this->service->getDisputes($filters, $perPage);

        return response()->json([
            'success' => true,
            'data' => $disputes->items(),
            'meta' => [
                'current_page' => $disputes->currentPage(),
                'last_page' => $disputes->lastPage(),
                'per_page' => $disputes->perPage(),
                'total' => $disputes->total(),
            ],
        ]);
    }

    /**
     * Show single dispute details.
     */
    public function showDispute(string $identifier): JsonResponse
    {
        $dispute = PaymentDispute::with([
            'payment',
            'paymentIntent',
            'client',
            'refund',
            'resolvedByUser'
        ])
        ->where('id', $identifier)
        ->orWhere('uuid', $identifier)
        ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $dispute,
        ]);
    }

    /**
     * Open a dispute case.
     */
    public function openDispute(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_id' => 'required',
            'disputed_amount' => 'required|numeric|min:0.01',
            'currency' => 'nullable|string|size:3',
            'dispute_source' => 'required|in:chargeback_visa_mc,momo_fraud_claim,client_portal_inquiry',
            'reason' => 'required|string|max:1000',
            'evidence_deadline' => 'nullable|date',
            'evidence_files' => 'nullable|array',
            'metadata' => 'nullable|array',
        ]);

        try {
            $dispute = $this->service->openDispute($validated);

            return response()->json([
                'success' => true,
                'message' => 'Dispute case successfully logged.',
                'data' => $dispute,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to open dispute: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Submit arbitration or verification evidence.
     */
    public function submitEvidence(Request $request, string $identifier): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'file_path' => 'nullable|string|max:500',
            'file_type' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $dispute = $this->service->submitDisputeEvidence($identifier, $validated);

            return response()->json([
                'success' => true,
                'message' => 'Arbitration evidence submitted successfully.',
                'data' => $dispute,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit evidence: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Resolve dispute (won, lost, settled).
     */
    public function resolveDispute(Request $request, string $identifier): JsonResponse
    {
        $validated = $request->validate([
            'resolution' => 'required|in:won,lost,settled',
            'resolution_notes' => 'nullable|string|max:1000',
            'create_refund' => 'nullable|boolean',
        ]);

        $createRefund = filter_var($request->input('create_refund', false), FILTER_VALIDATE_BOOLEAN);

        try {
            $dispute = $this->service->resolveDispute(
                $identifier,
                $validated['resolution'],
                $validated['resolution_notes'] ?? null,
                $createRefund,
                auth()->id()
            );

            return response()->json([
                'success' => true,
                'message' => "Dispute resolved as '{$validated['resolution']}'." . ($createRefund ? ' Automated refund executed.' : ''),
                'data' => $dispute,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to resolve dispute: ' . $e->getMessage(),
            ], 500);
        }
    }
}
