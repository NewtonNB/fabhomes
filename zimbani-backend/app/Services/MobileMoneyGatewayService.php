<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Client;
use App\Models\MobileMoneyGateway;
use App\Models\MobileMoneyTransaction;
use App\Models\Payment;
use App\Models\PaymentCertificate;
use App\Models\PaymentWebhookLog;
use App\Models\PettyCashAccount;
use App\Models\PettyCashTransaction;
use App\Models\SavingsAccount;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class MobileMoneyGatewayService
{
    protected ConstructionSavingSchemeService $schemeService;

    public function __construct(ConstructionSavingSchemeService $schemeService)
    {
        $this->schemeService = $schemeService;
    }

    /**
     * Initiate a Mobile Money STK Push (C2B Collection) from client phone.
     */
    public function initiateStkPushCollection(array $data, ?User $user = null): MobileMoneyTransaction
    {
        return DB::transaction(function () use ($data, $user) {
            $rawPhone = $data['phone_number'];
            $phone = MobileMoneyGateway::formatPhoneNumber($rawPhone);
            $amount = (float) $data['amount'];
            $currency = $data['currency'] ?? 'UGX';

            if ($amount <= 0) {
                throw new InvalidArgumentException("Collection amount must be greater than zero.");
            }

            $provider = $data['provider'] ?? MobileMoneyGateway::detectProviderFromPhone($phone);

            // Resolve client & savings account if provided
            $client = null;
            if (!empty($data['client_id'])) {
                $client = Client::find($data['client_id']);
            }

            $savingsAccount = null;
            if (!empty($data['savings_account_id'])) {
                $savingsAccount = SavingsAccount::find($data['savings_account_id']);
                if ($savingsAccount && !$client) {
                    $client = $savingsAccount->client;
                }
            }

            // Create pending internal Payment record
            $paymentNumber = 'PAY-' . now()->format('Ymd') . '-' . strtoupper(Str::random(4));
            $payment = Payment::create([
                'payment_number' => $paymentNumber,
                'reference_number' => 'MM-STK-' . date('Ymd-His'),
                'client_id' => $client?->id,
                'savings_account_id' => $savingsAccount?->id,
                'unit_id' => $data['unit_id'] ?? $savingsAccount?->plot_id,
                'processed_by' => $user?->id ?? auth()->id(),
                'payment_type' => $savingsAccount ? 'deposit' : 'installment',
                'payment_method' => 'mobile_money',
                'status' => 'pending',
                'amount' => $amount,
                'currency' => $currency,
                'total_amount' => $amount,
                'payment_date' => now()->toDateString(),
                'mobile_money_number' => $phone,
                'notes' => $data['notes'] ?? ("Mobile Money ({$provider}) STK Push collection for " . ($client?->name ?? 'Client')),
            ]);

            // External mock gateway response simulation
            $extRef = 'EXT-' . strtoupper(Str::random(12));
            $reqPayload = [
                'msisdn' => $phone,
                'amount' => $amount,
                'currency' => $currency,
                'external_id' => $paymentNumber,
                'provider' => $provider,
                'timestamp' => now()->toIso8601String(),
            ];
            $resPayload = [
                'status' => 'PENDING_USER_INPUT',
                'message' => 'STK push prompt dispatched to handset.',
                'financialTransactionId' => $extRef,
            ];

            // Create Mobile Money Transaction
            $mmTx = MobileMoneyTransaction::create([
                'external_reference' => $extRef,
                'provider' => $provider,
                'transaction_type' => 'c2b_collection',
                'phone_number' => $phone,
                'payer_or_payee_name' => $data['payer_name'] ?? $client?->name ?? 'Mobile Subscriber',
                'amount' => $amount,
                'fee_amount' => $data['fee_amount'] ?? 0.00,
                'net_amount' => $amount - (float) ($data['fee_amount'] ?? 0.00),
                'currency' => $currency,
                'status' => 'pending',
                'purpose' => $data['purpose'] ?? 'savings_deposit',
                'client_id' => $client?->id,
                'savings_account_id' => $savingsAccount?->id,
                'milestone_savings_pool_id' => $data['milestone_savings_pool_id'] ?? null,
                'payment_id' => $payment->id,
                'initiated_by' => $user?->id ?? auth()->id(),
                'initiated_at' => now(),
                'request_payload' => $reqPayload,
                'response_payload' => $resPayload,
            ]);

            Activity::log(
                'mobile_money_stk_push_initiated',
                "Dispatched {$provider} STK push of {$amount} {$currency} to {$phone} (Ref: {$mmTx->transaction_reference})",
                $mmTx,
                $user ?? auth()->user()
            );

            return $mmTx->fresh(['payment', 'client', 'savingsAccount']);
        });
    }

    /**
     * Process an incoming Instant Payment Notification (IPN) webhook from MTN/Airtel/Gateway.
     */
    public function processIncomingWebhook(
        string $provider,
        array $payload,
        array $headers = [],
        ?string $ip = null
    ): array {
        return DB::transaction(function () use ($provider, $payload, $headers, $ip) {
            $extRef = $payload['financialTransactionId'] ?? $payload['transaction_id'] ?? $payload['external_id'] ?? $payload['reference'] ?? null;
            $statusRaw = strtoupper($payload['status'] ?? $payload['transaction_status'] ?? 'SUCCESSFUL');
            $failureReason = $payload['failure_reason'] ?? $payload['message'] ?? null;

            // Log raw webhook
            $webhookLog = PaymentWebhookLog::create([
                'provider' => $provider,
                'event_type' => $payload['event_type'] ?? 'collection.callback',
                'external_reference' => $extRef,
                'headers' => $headers,
                'payload' => $payload,
                'ip_address' => $ip,
                'status' => 'received',
            ]);

            // Locate matching Mobile Money Transaction
            $mmTx = null;
            if ($extRef) {
                $mmTx = MobileMoneyTransaction::where('external_reference', $extRef)
                    ->orWhere('transaction_reference', $extRef)
                    ->first();
            }

            if (!$mmTx && isset($payload['internal_reference'])) {
                $mmTx = MobileMoneyTransaction::where('transaction_reference', $payload['internal_reference'])->first();
            }

            if (!$mmTx) {
                $webhookLog->status = 'ignored';
                $webhookLog->processing_error = "No matching mobile money transaction found for reference {$extRef}";
                $webhookLog->save();

                return [
                    'status' => 'ignored',
                    'message' => 'No matching transaction found',
                ];
            }

            $webhookLog->mobile_money_transaction_id = $mmTx->id;

            // Idempotency check: if already settled, return immediately
            if ($mmTx->status === 'successful') {
                $webhookLog->status = 'processed';
                $webhookLog->processed_at = now();
                $webhookLog->save();

                return [
                    'status' => 'already_processed',
                    'transaction' => $mmTx,
                ];
            }

            $isSuccess = in_array($statusRaw, ['SUCCESSFUL', 'SUCCESS', 'APPROVED', 'COMPLETED', '200']);

            if ($isSuccess) {
                $mmTx->status = 'successful';
                $mmTx->completed_at = now();
                $mmTx->callback_payload = $payload;
                $mmTx->save();

                // 1. Confirm linked Payment
                if ($mmTx->payment_id) {
                    $payment = Payment::find($mmTx->payment_id);
                    if ($payment && $payment->status !== 'confirmed') {
                        $payment->status = 'confirmed';
                        $payment->confirmed_at_date = now()->toDateString();
                        $payment->confirmed_by = $mmTx->initiated_by ?? 1;
                        $payment->save();
                    }
                }

                // 2. Credit Savings Account and Double-Entry Ledger
                if ($mmTx->savings_account_id) {
                    $account = SavingsAccount::find($mmTx->savings_account_id);
                    if ($account) {
                        // Record double-entry ledger entry (Transaction::record atomically adjusts $account->current_balance)
                        $ledgerTx = Transaction::record([
                            'account_id' => $account->id,
                            'client_id' => $account->client_id,
                            'payment_id' => $mmTx->payment_id,
                            'transaction_type' => 'payment',
                            'amount' => (float) $mmTx->amount,
                            'currency' => $mmTx->currency,
                            'description' => "Client mobile money deposit {$mmTx->transaction_reference} ({$provider})",
                            'narration' => "Instant mobile money collection from {$mmTx->phone_number}",
                            'reference_number' => $mmTx->transaction_reference,
                            'transaction_date' => now(),
                            'value_date' => now()->toDateString(),
                            'created_by' => $mmTx->initiated_by ?? 1,
                        ]);

                        $mmTx->ledger_transaction_id = $ledgerTx->id;
                        $mmTx->save();

                        // 3. If account has tiered milestone pools, run waterfall allocation
                        if ($account->account_type === 'construction_saving' && $account->milestonePools()->exists()) {
                            $this->schemeService->allocateDeposit(
                                $account->fresh(),
                                (float) $mmTx->amount,
                                $mmTx->payment_id,
                                'waterfall'
                            );
                        }
                    }
                }

                Activity::log(
                    'mobile_money_collection_successful',
                    "Mobile Money collection {$mmTx->transaction_reference} confirmed: {$mmTx->amount} {$mmTx->currency} credited from {$mmTx->phone_number}",
                    $mmTx
                );
            } else {
                $mmTx->status = 'failed';
                $mmTx->failure_reason = $failureReason ?? 'Subscriber cancelled prompt or insufficient mobile wallet balance';
                $mmTx->completed_at = now();
                $mmTx->callback_payload = $payload;
                $mmTx->save();

                if ($mmTx->payment_id) {
                    $payment = Payment::find($mmTx->payment_id);
                    if ($payment) {
                        $payment->status = 'rejected';
                        $payment->notes = ($payment->notes ? $payment->notes . "\n" : '') . "Mobile Money failed: " . $mmTx->failure_reason;
                        $payment->save();
                    }
                }

                Activity::log(
                    'mobile_money_collection_failed',
                    "Mobile Money collection {$mmTx->transaction_reference} failed: {$mmTx->failure_reason}",
                    $mmTx
                );
            }

            $webhookLog->status = 'processed';
            $webhookLog->processed_at = now();
            $webhookLog->save();

            return [
                'status' => $mmTx->status,
                'transaction' => $mmTx->fresh(),
            ];
        });
    }

    /**
     * Initiate an automated B2C Mobile Money disbursement (subcontractor payout, petty cash, casual wages).
     */
    public function initiateB2cDisbursement(array $data, ?User $user = null): MobileMoneyTransaction
    {
        return DB::transaction(function () use ($data, $user) {
            $rawPhone = $data['phone_number'];
            $phone = MobileMoneyGateway::formatPhoneNumber($rawPhone);
            $amount = (float) $data['amount'];
            $currency = $data['currency'] ?? 'UGX';
            $purpose = $data['purpose'] ?? 'contractor_payout';

            if ($amount <= 0) {
                throw new InvalidArgumentException("Disbursement amount must be greater than zero.");
            }

            $provider = $data['provider'] ?? MobileMoneyGateway::detectProviderFromPhone($phone);

            // Verify gateway daily limit
            $gateway = MobileMoneyGateway::where('provider', $provider)->where('is_active', true)->first();
            if ($gateway) {
                if (((float) $gateway->current_daily_disbursed + $amount) > (float) $gateway->daily_disbursement_limit) {
                    throw new InvalidArgumentException(
                        "Disbursement of {$amount} {$currency} exceeds daily limit of {$gateway->daily_disbursement_limit} {$currency}."
                    );
                }
            }

            $extRef = 'DISB-' . strtoupper(Str::random(12));
            $reqPayload = [
                'recipient_msisdn' => $phone,
                'recipient_name' => $data['payee_name'] ?? 'Contractor / Payee',
                'amount' => $amount,
                'currency' => $currency,
                'purpose' => $purpose,
                'timestamp' => now()->toIso8601String(),
            ];

            $mmTx = MobileMoneyTransaction::create([
                'external_reference' => $extRef,
                'provider' => $provider,
                'transaction_type' => 'b2c_disbursement',
                'phone_number' => $phone,
                'payer_or_payee_name' => $data['payee_name'] ?? 'Contractor / Payee',
                'amount' => $amount,
                'fee_amount' => $data['fee_amount'] ?? 1000.00, // Standard B2C telecom transfer charge
                'net_amount' => $amount,
                'currency' => $currency,
                'status' => 'processing',
                'purpose' => $purpose,
                'payment_certificate_id' => $data['payment_certificate_id'] ?? null,
                'milestone_payment_release_id' => $data['milestone_payment_release_id'] ?? null,
                'petty_cash_account_id' => $data['petty_cash_account_id'] ?? null,
                'initiated_by' => $user?->id ?? auth()->id(),
                'authorized_by' => $user?->id ?? auth()->id(),
                'initiated_at' => now(),
                'request_payload' => $reqPayload,
            ]);

            // Execute direct settlement
            $mmTx->status = 'successful';
            $mmTx->completed_at = now();
            $mmTx->response_payload = [
                'status' => 'SUCCESSFUL',
                'financialTransactionId' => $extRef,
                'disbursed_at' => now()->toIso8601String(),
            ];
            $mmTx->save();

            // Handle linked entity updates
            if (!empty($data['petty_cash_account_id'])) {
                $pettyCash = PettyCashAccount::find($data['petty_cash_account_id']);
                if ($pettyCash) {
                    $bBefore = (float) $pettyCash->current_balance;
                    $bAfter = $bBefore + $amount;
                    $pettyCash->current_balance = $bAfter;
                    $pettyCash->save();

                    PettyCashTransaction::create([
                        'petty_cash_account_id' => $pettyCash->id,
                        'transaction_type' => 'replenishment',
                        'amount' => $amount,
                        'balance_before' => $bBefore,
                        'balance_after' => $bAfter,
                        'reference_number' => $mmTx->transaction_reference,
                        'description' => "Automated Mobile Money Top-Up via {$provider} to {$phone}",
                        'approved_by' => $user?->id ?? auth()->id(),
                        'approved_at' => now(),
                    ]);
                }
            }

            if (!empty($data['payment_certificate_id'])) {
                $ipc = PaymentCertificate::find($data['payment_certificate_id']);
                if ($ipc && $ipc->status !== 'paid') {
                    $ipc->status = 'paid';
                    $ipc->paid_at = now();
                    $ipc->paid_by = $user?->id ?? auth()->id();
                    $ipc->payment_reference = $mmTx->transaction_reference;
                    $ipc->save();
                }
            }

            // Update gateway limits
            if ($gateway) {
                $gateway->current_daily_disbursed = (float) $gateway->current_daily_disbursed + $amount;
                $gateway->save();
            }

            Activity::log(
                'mobile_money_b2c_disbursed',
                "Disbursed {$amount} {$currency} via {$provider} to {$phone} ({$data['payee_name']}) for {$purpose}",
                $mmTx,
                $user ?? auth()->user()
            );

            return $mmTx->fresh();
        });
    }

    /**
     * Development / Staging simulator for testing STK push completions and callbacks.
     */
    public function simulateWebhookCallback(
        string $transactionReference,
        string $status = 'SUCCESSFUL',
        ?string $failureReason = null
    ): array {
        $mmTx = MobileMoneyTransaction::where('transaction_reference', $transactionReference)
            ->orWhere('external_reference', $transactionReference)
            ->firstOrFail();

        $payload = [
            'financialTransactionId' => $mmTx->external_reference,
            'internal_reference' => $mmTx->transaction_reference,
            'status' => $status,
            'amount' => $mmTx->amount,
            'currency' => $mmTx->currency,
            'payer_msisdn' => $mmTx->phone_number,
            'failure_reason' => $failureReason,
            'timestamp' => now()->toIso8601String(),
        ];

        return $this->processIncomingWebhook(
            $mmTx->provider,
            $payload,
            ['X-Simulator-Test' => 'true', 'User-Agent' => 'ZimbaniMockGateway/1.0'],
            '127.0.0.1'
        );
    }

    /**
     * Get statistics and summary of mobile money transactions.
     */
    public function getTransactionStatistics(): array
    {
        $collections = MobileMoneyTransaction::where('transaction_type', 'c2b_collection');
        $disbursements = MobileMoneyTransaction::where('transaction_type', 'b2c_disbursement');

        $totalCollected = (float) (clone $collections)->where('status', 'successful')->sum('amount');
        $totalDisbursed = (float) (clone $disbursements)->where('status', 'successful')->sum('amount');
        $pendingCount = MobileMoneyTransaction::where('status', 'pending')->count();
        $successfulCount = MobileMoneyTransaction::where('status', 'successful')->count();
        $totalCount = MobileMoneyTransaction::count();

        $successRate = $totalCount > 0 ? round(($successfulCount / $totalCount) * 100, 1) : 100.0;

        return [
            'total_collected' => $totalCollected,
            'total_disbursed' => $totalDisbursed,
            'pending_count' => $pendingCount,
            'successful_count' => $successfulCount,
            'total_transactions' => $totalCount,
            'success_rate' => $successRate,
            'currency' => 'UGX',
        ];
    }
}
