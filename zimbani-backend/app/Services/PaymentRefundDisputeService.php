<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Payment;
use App\Models\PaymentDispute;
use App\Models\PaymentIntent;
use App\Models\PaymentRefund;
use App\Models\SavingsAccount;
use App\Models\Transaction;
use App\Services\Gateways\PaymentGatewayManager;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use InvalidArgumentException;

class PaymentRefundDisputeService
{
    public function __construct(
        protected PaymentGatewayManager $gatewayManager
    ) {}

    /**
     * Request a new refund.
     */
    public function requestRefund(array $data, ?int $requestedBy = null): PaymentRefund
    {
        return DB::transaction(function () use ($data, $requestedBy) {
            $payment = Payment::where('id', $data['payment_id'])
                ->orWhere('uuid', $data['payment_id'])
                ->firstOrFail();

            if (!in_array($payment->status, ['confirmed', 'verified'])) {
                throw new InvalidArgumentException("Payment {$payment->payment_number} cannot be refunded because status is '{$payment->status}'.");
            }

            $alreadyRefunded = PaymentRefund::where('payment_id', $payment->id)
                ->whereIn('status', ['requested', 'approved', 'processing', 'completed'])
                ->sum('amount');

            $availableForRefund = round((float) $payment->amount - (float) $alreadyRefunded, 2);
            $requestedAmount = round((float) $data['amount'], 2);

            if ($requestedAmount <= 0) {
                throw new InvalidArgumentException("Refund amount must be greater than zero.");
            }

            if ($requestedAmount > $availableForRefund) {
                throw new InvalidArgumentException("Requested refund amount ({$requestedAmount}) exceeds eligible remaining balance ({$availableForRefund}).");
            }

            $paymentIntent = null;
            if (!empty($data['payment_intent_id'])) {
                $paymentIntent = PaymentIntent::find($data['payment_intent_id']);
            } elseif ($payment->reference_number) {
                $paymentIntent = PaymentIntent::where('intent_reference', $payment->reference_number)->first();
            }

            $deductionPercentage = isset($data['deduction_percentage']) ? (float) $data['deduction_percentage'] : 0.00;
            $deductionAmount = isset($data['deduction_amount']) ? (float) $data['deduction_amount'] : ($requestedAmount * ($deductionPercentage / 100));
            $balanceAfterRefund = isset($data['balance_after_refund']) ? (float) $data['balance_after_refund'] : max(0, $availableForRefund - $requestedAmount);

            $refund = PaymentRefund::create([
                'payment_id' => $payment->id,
                'payment_intent_id' => $paymentIntent?->id,
                'client_id' => $payment->client_id,
                'savings_account_id' => $data['savings_account_id'] ?? $payment->savings_account_id,
                'phase_name' => $data['phase_name'] ?? 'Phase 1',
                'scheme_name' => $data['scheme_name'] ?? 'Mukono Greenfield',
                'notice_date' => $data['notice_date'] ?? now()->toDateString(),
                'amount' => $requestedAmount,
                'deduction_percentage' => $deductionPercentage,
                'deduction_amount' => $deductionAmount,
                'balance_after_refund' => $balanceAfterRefund,
                'currency' => $data['currency'] ?? $payment->currency ?? 'UGX',
                'fee_refunded' => $data['fee_refunded'] ?? 0.00,
                'reason_category' => $data['reason_category'] ?? 'client_cancellation',
                'reason_description' => $data['reason_description'] ?? 'Savings withdrawal refund request',
                'withdrawal_reason' => $data['withdrawal_reason'] ?? $data['reason_description'] ?? 'Client withdrawal',
                'payment_method' => $data['payment_method'] ?? 'bank_transfer',
                'notes' => $data['notes'] ?? null,
                'status' => 'requested',
                'requested_by' => $requestedBy ?? auth()->id() ?? 1,
                'metadata' => $data['metadata'] ?? null,
            ]);

            return $refund->load(['payment', 'client', 'savingsAccount', 'requestedByUser']);
        });
    }

    /**
     * Approve a pending refund request.
     */
    public function approveRefund(string|int $identifier, ?int $approvedBy = null, bool $autoExecute = true): PaymentRefund
    {
        $refund = PaymentRefund::where('id', $identifier)
            ->orWhere('uuid', $identifier)
            ->firstOrFail();

        if ($refund->status !== 'requested') {
            throw new InvalidArgumentException("Only refunds with 'requested' status can be approved (current: '{$refund->status}').");
        }

        $refund->update([
            'status' => 'approved',
            'approved_by' => $approvedBy ?? auth()->id() ?? 1,
            'approved_at' => now(),
        ]);

        if ($autoExecute) {
            return $this->executeRefund($refund);
        }

        return $refund->fresh(['payment', 'client', 'savingsAccount', 'approvedByUser']);
    }

    /**
     * Reject a pending refund request.
     */
    public function rejectRefund(string|int $identifier, string $rejectionReason, ?int $rejectedBy = null): PaymentRefund
    {
        $refund = PaymentRefund::where('id', $identifier)
            ->orWhere('uuid', $identifier)
            ->firstOrFail();

        if ($refund->status !== 'requested') {
            throw new InvalidArgumentException("Only refunds with 'requested' status can be rejected (current: '{$refund->status}').");
        }

        $refund->update([
            'status' => 'rejected',
            'rejected_by' => $rejectedBy ?? auth()->id() ?? 1,
            'rejected_at' => now(),
            'rejection_reason' => $rejectionReason,
        ]);

        return $refund->fresh(['payment', 'client', 'savingsAccount', 'rejectedByUser']);
    }

    /**
     * Execute approved refund: calls gateway driver if available, posts reversing debit transaction to ledger, updates balances.
     */
    public function executeRefund(PaymentRefund|string|int $refund): PaymentRefund
    {
        return DB::transaction(function () use ($refund) {
            if (!$refund instanceof PaymentRefund) {
                $refund = PaymentRefund::where('id', $refund)
                    ->orWhere('uuid', $refund)
                    ->firstOrFail();
            }

            if (!in_array($refund->status, ['requested', 'approved'])) {
                throw new InvalidArgumentException("Cannot execute refund in '{$refund->status}' status.");
            }

            $refund->update(['status' => 'processing']);

            $payment = $refund->payment;
            $paymentIntent = $refund->paymentIntent;

            // 1. Process via gateway adapter if associated intent exists
            $gatewayResponse = ['channel' => 'direct_ledger_reversal'];
            $gatewayRef = 'REF-INT-' . strtoupper(bin2hex(random_bytes(4)));

            if ($paymentIntent && $paymentIntent->gateway_name) {
                try {
                    $adapter = $this->gatewayManager->driver($paymentIntent->gateway_name);
                    $gatewayResult = $adapter->processRefund($paymentIntent, (float) $refund->amount, $refund->reason_description);
                    $gatewayResponse = $gatewayResult;
                    $gatewayRef = $gatewayResult['refund_reference'] ?? $gatewayRef;
                } catch (\Exception $e) {
                    Log::warning("Gateway refund call failed, falling back to manual ledger reversal: " . $e->getMessage());
                    $gatewayResponse = [
                        'channel' => $paymentIntent->gateway_name,
                        'warning' => 'Gateway call exception logged: ' . $e->getMessage(),
                    ];
                }
            }

            // 2. Double-entry accounting reversal on Client Savings Account
            $reversalTransaction = null;
            if ($refund->savings_account_id) {
                $account = SavingsAccount::find($refund->savings_account_id);
                if ($account) {
                    $balanceBefore = (float) $account->current_balance;
                    $balanceAfter = max(0.00, $balanceBefore - (float) $refund->amount);

                    $txCount = Transaction::whereYear('created_at', date('Y'))->count() + 1;
                    $txNumber = sprintf('TXN-%s%02d-%04d', date('Y'), date('m'), $txCount);

                    $reversalTransaction = Transaction::create([
                        'uuid' => (string) Str::uuid(),
                        'transaction_number' => $txNumber,
                        'account_id' => $account->id,
                        'client_id' => $refund->client_id,
                        'payment_id' => $payment?->id,
                        'transaction_type' => 'refund',
                        'amount' => -abs((float) $refund->amount), // Negative for debit reversal
                        'currency' => $refund->currency,
                        'balance_before' => $balanceBefore,
                        'balance_after' => $balanceAfter,
                        'description' => "Automated Refund [{$refund->refund_number}]: {$refund->reason_category} - {$refund->reason_description}",
                        'narration' => "Reversal of payment {$payment?->payment_number}",
                        'reference_number' => $refund->refund_number,
                        'transaction_date' => now(),
                        'value_date' => now()->toDateString(),
                        'status' => 'posted',
                        'created_by' => auth()->id() ?? 1,
                    ]);

                    $account->update(['current_balance' => $balanceAfter]);
                }
            }

            // 3. Update Refund record to completed
            $refund->update([
                'status' => 'completed',
                'processed_at' => now(),
                'gateway_refund_reference' => $gatewayRef,
                'gateway_response' => $gatewayResponse,
                'reversal_transaction_id' => $reversalTransaction?->id,
            ]);

            // 4. Check if total refunded satisfies full payment refund
            if ($payment) {
                $totalCompletedRefunds = PaymentRefund::where('payment_id', $payment->id)
                    ->where('status', 'completed')
                    ->sum('amount');

                if ((float) $totalCompletedRefunds >= (float) $payment->amount) {
                    $payment->update(['status' => 'refunded']);
                }
            }

            return $refund->fresh(['payment', 'client', 'savingsAccount', 'reversalTransaction', 'approvedByUser']);
        });
    }

    /**
     * Open a dispute or chargeback case.
     */
    public function openDispute(array $data): PaymentDispute
    {
        $payment = Payment::where('id', $data['payment_id'])
            ->orWhere('uuid', $data['payment_id'])
            ->firstOrFail();

        $paymentIntent = null;
        if (!empty($data['payment_intent_id'])) {
            $paymentIntent = PaymentIntent::find($data['payment_intent_id']);
        } elseif ($payment->reference_number) {
            $paymentIntent = PaymentIntent::where('intent_reference', $payment->reference_number)->first();
        }

        $dispute = PaymentDispute::create([
            'payment_id' => $payment->id,
            'payment_intent_id' => $paymentIntent?->id,
            'client_id' => $payment->client_id,
            'dispute_source' => $data['dispute_source'] ?? 'client_portal_inquiry',
            'disputed_amount' => $data['disputed_amount'] ?? $payment->amount,
            'currency' => $data['currency'] ?? $payment->currency ?? 'UGX',
            'reason' => $data['reason'] ?? 'Dispute filed by payer',
            'evidence_deadline' => !empty($data['evidence_deadline']) 
                ? Carbon::parse($data['evidence_deadline']) 
                : Carbon::now()->addDays(7),
            'status' => 'opened',
            'evidence_files' => $data['evidence_files'] ?? [],
            'metadata' => $data['metadata'] ?? null,
        ]);

        return $dispute->load(['payment', 'client', 'paymentIntent']);
    }

    /**
     * Submit arbitration or verification evidence for an active dispute.
     */
    public function submitDisputeEvidence(string|int $identifier, array $evidenceItem): PaymentDispute
    {
        $dispute = PaymentDispute::where('id', $identifier)
            ->orWhere('uuid', $identifier)
            ->firstOrFail();

        $existingEvidence = $dispute->evidence_files ?? [];
        $evidenceRecord = [
            'title' => $evidenceItem['title'] ?? 'Arbitration Evidence Document',
            'file_path' => $evidenceItem['file_path'] ?? '',
            'file_type' => $evidenceItem['file_type'] ?? 'document',
            'submitted_at' => now()->toIso8601String(),
            'submitted_by' => auth()->user()?->name ?? 'ZIMBANI System Officer',
            'notes' => $evidenceItem['notes'] ?? null,
        ];

        $existingEvidence[] = $evidenceRecord;

        $dispute->update([
            'evidence_files' => $existingEvidence,
            'status' => 'evidence_submitted',
        ]);

        return $dispute->fresh(['payment', 'client']);
    }

    /**
     * Resolve dispute (won, lost, or settled).
     * If resolution is 'lost' or 'settled' and $createRefund is true, automatically triggers a refund.
     */
    public function resolveDispute(
        string|int $identifier,
        string $resolution,
        ?string $resolutionNotes = null,
        bool $createRefund = false,
        ?int $resolvedBy = null
    ): PaymentDispute {
        if (!in_array($resolution, ['won', 'lost', 'settled'])) {
            throw new InvalidArgumentException("Resolution must be one of: 'won', 'lost', 'settled'.");
        }

        return DB::transaction(function () use ($identifier, $resolution, $resolutionNotes, $createRefund, $resolvedBy) {
            $dispute = PaymentDispute::where('id', $identifier)
                ->orWhere('uuid', $identifier)
                ->firstOrFail();

            $refundId = $dispute->refund_id;

            if (in_array($resolution, ['lost', 'settled']) && $createRefund && empty($refundId)) {
                $refund = $this->requestRefund([
                    'payment_id' => $dispute->payment_id,
                    'payment_intent_id' => $dispute->payment_intent_id,
                    'amount' => $dispute->disputed_amount,
                    'currency' => $dispute->currency,
                    'reason_category' => 'disputed_chargeback',
                    'reason_description' => "Dispute Settlement: [{$dispute->dispute_number}] - {$resolutionNotes}",
                ], $resolvedBy ?? auth()->id() ?? 1);

                $refund = $this->approveRefund($refund->id, $resolvedBy ?? auth()->id() ?? 1, true);
                $refundId = $refund->id;
            }

            $dispute->update([
                'status' => $resolution,
                'resolution_notes' => $resolutionNotes,
                'resolved_at' => now(),
                'resolved_by' => $resolvedBy ?? auth()->id() ?? 1,
                'refund_id' => $refundId,
            ]);

            return $dispute->fresh(['payment', 'client', 'refund', 'resolvedByUser']);
        });
    }

    /**
     * Get paginated refunds list.
     */
    public function getRefunds(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = PaymentRefund::with(['payment', 'client', 'savingsAccount', 'reversalTransaction', 'requestedByUser', 'approvedByUser'])
            ->latest('created_at');

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['reason_category'])) {
            $query->where('reason_category', $filters['reason_category']);
        }

        if (!empty($filters['client_id'])) {
            $query->where('client_id', $filters['client_id']);
        }

        if (!empty($filters['payment_id'])) {
            $query->where('payment_id', $filters['payment_id']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('refund_number', 'like', "%{$search}%")
                    ->orWhere('reason_description', 'like', "%{$search}%")
                    ->orWhere('gateway_refund_reference', 'like', "%{$search}%");
            });
        }

        return $query->paginate($perPage);
    }

    /**
     * Get paginated disputes list.
     */
    public function getDisputes(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = PaymentDispute::with(['payment', 'client', 'refund', 'resolvedByUser'])
            ->latest('created_at');

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['dispute_source'])) {
            $query->where('dispute_source', $filters['dispute_source']);
        }

        if (!empty($filters['client_id'])) {
            $query->where('client_id', $filters['client_id']);
        }

        if (!empty($filters['payment_id'])) {
            $query->where('payment_id', $filters['payment_id']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('dispute_number', 'like', "%{$search}%")
                    ->orWhere('reason', 'like', "%{$search}%")
                    ->orWhere('resolution_notes', 'like', "%{$search}%");
            });
        }

        return $query->paginate($perPage);
    }

    /**
     * Get aggregate statistics for refunds and disputes ledger.
     */
    public function getStatistics(): array
    {
        // Refund aggregates
        $totalRefundsCount = PaymentRefund::count();
        $totalRefundedAmount = (float) PaymentRefund::where('status', 'completed')->sum('amount');
        $pendingRefundsCount = PaymentRefund::where('status', 'requested')->count();
        $approvedRefundsCount = PaymentRefund::where('status', 'approved')->count();
        $rejectedRefundsCount = PaymentRefund::where('status', 'rejected')->count();

        $refundsByCategory = PaymentRefund::select('reason_category', DB::raw('count(*) as count'), DB::raw('sum(amount) as total_amount'))
            ->groupBy('reason_category')
            ->get();

        // Dispute aggregates
        $totalDisputesCount = PaymentDispute::count();
        $totalDisputedAmount = (float) PaymentDispute::sum('disputed_amount');
        $openDisputesCount = PaymentDispute::whereIn('status', ['opened', 'evidence_submitted', 'under_review'])->count();
        $wonDisputesCount = PaymentDispute::where('status', 'won')->count();
        $lostDisputesCount = PaymentDispute::where('status', 'lost')->count();
        $settledDisputesCount = PaymentDispute::where('status', 'settled')->count();

        $resolvedCount = $wonDisputesCount + $lostDisputesCount + $settledDisputesCount;
        $winRatePercentage = $resolvedCount > 0 ? round(($wonDisputesCount / $resolvedCount) * 100, 1) : 100.0;

        $disputesBySource = PaymentDispute::select('dispute_source', DB::raw('count(*) as count'), DB::raw('sum(disputed_amount) as total_amount'))
            ->groupBy('dispute_source')
            ->get();

        return [
            'refunds' => [
                'total_count' => $totalRefundsCount,
                'total_refunded_amount' => $totalRefundedAmount,
                'pending_approval_count' => $pendingRefundsCount,
                'approved_count' => $approvedRefundsCount,
                'rejected_count' => $rejectedRefundsCount,
                'by_category' => $refundsByCategory,
            ],
            'disputes' => [
                'total_count' => $totalDisputesCount,
                'total_disputed_amount' => $totalDisputedAmount,
                'active_open_count' => $openDisputesCount,
                'won_count' => $wonDisputesCount,
                'lost_count' => $lostDisputesCount,
                'settled_count' => $settledDisputesCount,
                'win_rate_percentage' => $winRatePercentage,
                'by_source' => $disputesBySource,
            ],
        ];
    }
}
