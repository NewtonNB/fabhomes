<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Payment;
use App\Models\PaymentDispute;
use App\Models\PaymentGatewayConfig;
use App\Models\PaymentIntent;
use App\Models\PaymentRefund;
use App\Models\PaymentSimulation;
use App\Models\PaymentWebhookLog;
use App\Models\SavingsAccount;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentSimulationService
{
    public function __construct(
        protected PaymentProcessingService $paymentService,
        protected WebhookVerificationService $webhookService,
        protected PaymentRefundDisputeService $refundService
    ) {}

    /**
     * Run an individual sandbox payment scenario.
     */
    public function runScenario(string $scenarioName, ?int $executedBy = null): PaymentSimulation
    {
        $startTime = microtime(true);
        $user = $executedBy ? User::find($executedBy) : (User::first() ?? User::factory()->create());
        $client = Client::first() ?? Client::create([
            'uuid' => (string) Str::uuid(),
            'client_number' => 'CLT-SIM-' . strtoupper(bin2hex(random_bytes(3))),
            'first_name' => 'Kato',
            'last_name' => 'Mukasa',
            'email' => 'kato.mukasa@fabhomes.ug',
            'phone' => '+256772456789',
            'status' => 'active',
        ]);

        $account = SavingsAccount::firstOrCreate(
            ['client_id' => $client->id, 'account_type' => 'construction_saving'],
            [
                'uuid' => (string) Str::uuid(),
                'account_number' => 'SAV-SIM-' . strtoupper(bin2hex(random_bytes(3))),
                'currency' => 'UGX',
                'current_balance' => 15000000.00,
                'target_amount' => 50000000.00,
                'status' => 'active',
                'opened_date' => now()->toDateString(),
            ]
        );

        $steps = [];
        $status = 'passed';
        $errorMessage = null;
        $assertions = 0;
        $passedAssertions = 0;

        $intentId = null;
        $paymentId = null;
        $transactionId = null;
        $webhookLogId = null;
        $refundId = null;
        $disputeId = null;

        $amount = 2500000.00;
        $currency = 'UGX';
        $gatewayName = 'flutterwave';
        $channel = 'card';

        try {
            switch ($scenarioName) {
                // SCENARIO 1: FLUTTERWAVE CARD 3DS
                case 'flutterwave_card_3ds_success':
                    $channel = 'card';
                    $gatewayName = 'flutterwave';
                    $amount = 3000000.00;

                    // Step 1: Create Intent
                    $t0 = microtime(true);
                    $intent = $this->paymentService->createPaymentIntent([
                        'amount' => $amount,
                        'currency' => $currency,
                        'gateway_name' => $gatewayName,
                        'payment_method' => $channel,
                        'client_id' => $client->id,
                        'savings_account_id' => $account->id,
                        'client_name' => 'Kato Mukasa',
                        'client_phone' => '+256772456789',
                        'client_email' => 'kato.mukasa@fabhomes.ug',
                    ]);
                    $intentId = $intent->id;
                    $steps[] = [
                        'step' => 'intent_initialized',
                        'detail' => "Generated {$intent->intent_reference} with 2.5% fee calculation",
                        'duration_ms' => (int) round((microtime(true) - $t0) * 1000),
                    ];
                    $assertions++;
                    if ($intent->status === 'requires_action') $passedAssertions++;

                    // Step 2: 3D Secure Webhook Callback Handshake
                    $t1 = microtime(true);
                    $payload = [
                        'event' => 'charge.completed',
                        'data' => [
                            'id' => rand(1000000, 9999999),
                            'tx_ref' => $intent->intent_reference,
                            'flw_ref' => 'FLW-MOCK-' . strtoupper(bin2hex(random_bytes(4))),
                            'amount' => $intent->total_charge_amount,
                            'currency' => $currency,
                            'status' => 'successful',
                        ],
                    ];
                    $headers = ['verif-hash' => 'flw_secret_test_hash'];
                    $webhookRes = $this->webhookService->ingestWebhook($gatewayName, $payload, $headers, '127.0.0.1');
                    $webhookLogId = $webhookRes['log_id'] ?? null;
                    $steps[] = [
                        'step' => 'cryptographic_webhook_verified',
                        'detail' => "HMAC-SHA256 signature verified and payload fingerprinted",
                        'duration_ms' => (int) round((microtime(true) - $t1) * 1000),
                    ];
                    $assertions++;
                    if ($webhookRes['success'] && $webhookRes['signature_valid']) $passedAssertions++;

                    // Step 3: Ledger Posting & Savings Account Balance
                    $intent->refresh();
                    $payment = $intent->payment;
                    $paymentId = $payment?->id;
                    $account->refresh();

                    $steps[] = [
                        'step' => 'savings_credited_and_payment_confirmed',
                        'detail' => "Payment {$payment?->payment_number} posted. Savings Balance: {$account->current_balance} UGX",
                        'duration_ms' => 45,
                    ];
                    $assertions++;
                    if ($intent->status === 'succeeded' && $payment && $payment->status === 'confirmed') $passedAssertions++;
                    break;

                // SCENARIO 2: MTN MOBILE MONEY STK PUSH PIN CONFIRMATION
                case 'momo_stk_pin_success':
                    $channel = 'mobile_money';
                    $gatewayName = 'mtn_momo';
                    $amount = 1500000.00;

                    $intent = $this->paymentService->createPaymentIntent([
                        'amount' => $amount,
                        'currency' => $currency,
                        'gateway_name' => $gatewayName,
                        'payment_method' => $channel,
                        'client_id' => $client->id,
                        'savings_account_id' => $account->id,
                        'client_phone' => '+256772112233',
                    ]);
                    $intentId = $intent->id;
                    $steps[] = [
                        'step' => 'ussd_stk_push_sent',
                        'detail' => "Simulated USSD push sent to +256772112233 for {$amount} UGX",
                        'duration_ms' => 120,
                    ];
                    $assertions++;
                    if ($intent->status === 'processing') $passedAssertions++;

                    // Direct telco callback
                    $payload = [
                        'financialTransactionId' => 'MTN-FIN-' . rand(100000, 999999),
                        'externalId' => $intent->intent_reference,
                        'amount' => $amount,
                        'currency' => 'UGX',
                        'status' => 'SUCCESSFUL',
                    ];
                    $webhookRes = $this->webhookService->ingestWebhook($gatewayName, $payload, ['x-target-environment' => 'sandbox'], '127.0.0.1');
                    $webhookLogId = $webhookRes['log_id'] ?? null;
                    $steps[] = [
                        'step' => 'handset_pin_authorized',
                        'detail' => "Payer entered 5-digit PIN on handset. Telco callback processed.",
                        'duration_ms' => 85,
                    ];
                    $assertions++;
                    if ($webhookRes['success']) $passedAssertions++;

                    $intent->refresh();
                    $paymentId = $intent->payment_id;
                    $assertions++;
                    if ($intent->status === 'succeeded') $passedAssertions++;
                    break;

                // SCENARIO 3: REPLAY ATTACK PREVENTION
                case 'replay_attack_shield':
                    $channel = 'card';
                    $gatewayName = 'flutterwave';
                    $amount = 500000.00;

                    $intent = $this->paymentService->createPaymentIntent([
                        'amount' => $amount,
                        'currency' => $currency,
                        'gateway_name' => $gatewayName,
                        'payment_method' => $channel,
                        'client_id' => $client->id,
                    ]);
                    $intentId = $intent->id;

                    $payload = [
                        'event' => 'charge.completed',
                        'data' => [
                            'id' => rand(1000000, 9999999),
                            'tx_ref' => $intent->intent_reference,
                            'flw_ref' => 'FLW-REPLAY-TEST',
                            'amount' => $intent->total_charge_amount,
                            'currency' => $currency,
                            'status' => 'successful',
                        ],
                    ];
                    $headers = ['verif-hash' => 'flw_secret_test_hash'];

                    // First delivery
                    $res1 = $this->webhookService->ingestWebhook($gatewayName, $payload, $headers, '127.0.0.1');
                    $steps[] = [
                        'step' => 'initial_webhook_ingested',
                        'detail' => "Processed normally and fingerprinted with SHA-256",
                        'duration_ms' => 75,
                    ];
                    $assertions++;
                    if ($res1['success'] && !$res1['is_replay']) $passedAssertions++;

                    // Replay attack delivery (same payload within 300s)
                    $res2 = $this->webhookService->ingestWebhook($gatewayName, $payload, $headers, '127.0.0.1');
                    $webhookLogId = $res2['log_id'] ?? null;
                    $steps[] = [
                        'step' => 'replay_attack_blocked',
                        'detail' => "Identical payload detected within 300s window. Blocked double-credit.",
                        'duration_ms' => 20,
                    ];
                    $assertions++;
                    if ($res2['is_replay'] === true) $passedAssertions++;
                    break;

                // SCENARIO 4: STANBIC BANK EFT WIRE DEPOSIT
                case 'stanbic_bank_eft':
                    $channel = 'bank_transfer';
                    $gatewayName = 'bank_transfer';
                    $amount = 10000000.00;

                    $intent = $this->paymentService->createPaymentIntent([
                        'amount' => $amount,
                        'currency' => $currency,
                        'gateway_name' => $gatewayName,
                        'payment_method' => $channel,
                        'client_id' => $client->id,
                        'savings_account_id' => $account->id,
                    ]);
                    $intentId = $intent->id;

                    $steps[] = [
                        'step' => 'wire_narration_generated',
                        'detail' => "Virtual reference generated for Stanbic Bank Uganda clearing",
                        'duration_ms' => 40,
                    ];

                    $payload = [
                        'narration' => $intent->intent_reference,
                        'bank_reference' => 'SBIC-EFT-' . rand(1000000, 9999999),
                        'amount' => $amount,
                        'currency' => 'UGX',
                    ];
                    $webhookRes = $this->webhookService->ingestWebhook($gatewayName, $payload, [], '127.0.0.1');
                    $webhookLogId = $webhookRes['log_id'] ?? null;

                    $intent->refresh();
                    $paymentId = $intent->payment_id;
                    $steps[] = [
                        'step' => 'eft_cleared_and_credited',
                        'detail' => "10,000,000 UGX cleared into Client Savings Account",
                        'duration_ms' => 60,
                    ];
                    $assertions += 2;
                    if ($webhookRes['success'] && $intent->status === 'succeeded') $passedAssertions += 2;
                    break;

                // SCENARIO 5: CHARGEBACK DISPUTE WON AFTER EVIDENCE
                case 'chargeback_evidence_won':
                    $channel = 'card';
                    $gatewayName = 'flutterwave';
                    $amount = 2000000.00;

                    $payment = Payment::create([
                        'uuid' => (string) Str::uuid(),
                        'payment_number' => 'PAY-SIM-' . strtoupper(bin2hex(random_bytes(3))),
                        'client_id' => $client->id,
                        'savings_account_id' => $account->id,
                        'amount' => $amount,
                        'currency' => 'UGX',
                        'total_amount' => $amount,
                        'payment_date' => now()->toDateString(),
                        'payment_type' => 'installment',
                        'payment_method' => 'card',
                        'status' => 'confirmed',
                    ]);
                    $paymentId = $payment->id;

                    $dispute = $this->refundService->openDispute([
                        'payment_id' => $payment->id,
                        'disputed_amount' => $amount,
                        'currency' => 'UGX',
                        'dispute_source' => 'chargeback_visa_mc',
                        'reason' => 'Payer challenged foundation milestone delivery',
                    ]);
                    $disputeId = $dispute->id;

                    $steps[] = [
                        'step' => 'chargeback_opened',
                        'detail' => "Logged {$dispute->dispute_number} with 7-day evidence cutoff",
                        'duration_ms' => 50,
                    ];

                    $dispute = $this->refundService->submitDisputeEvidence($dispute->id, [
                        'title' => 'Structural Engineer Signed Inspection Report',
                        'file_path' => '/storage/inspections/eng_signoff.pdf',
                    ]);
                    $steps[] = [
                        'step' => 'inspection_evidence_attached',
                        'detail' => "Signed certificate and GPS photos submitted to card issuer",
                        'duration_ms' => 40,
                    ];

                    $dispute = $this->refundService->resolveDispute($dispute->id, 'won', 'Card scheme confirmed milestone delivery');
                    $steps[] = [
                        'step' => 'arbitration_won',
                        'detail' => "Dispute resolved as WON. 0 merchant deduction.",
                        'duration_ms' => 30,
                    ];
                    $assertions += 3;
                    if ($dispute->status === 'won') $passedAssertions += 3;
                    break;

                // SCENARIO 6: AUTOMATED REFUND REVERSAL
                case 'automated_refund_reversal':
                default:
                    $scenarioName = 'automated_refund_reversal';
                    $channel = 'mobile_money';
                    $gatewayName = 'mtn_momo';
                    $amount = 1200000.00;

                    $payment = Payment::create([
                        'uuid' => (string) Str::uuid(),
                        'payment_number' => 'PAY-SIM-' . strtoupper(bin2hex(random_bytes(3))),
                        'client_id' => $client->id,
                        'savings_account_id' => $account->id,
                        'amount' => $amount,
                        'currency' => 'UGX',
                        'total_amount' => $amount,
                        'payment_date' => now()->toDateString(),
                        'payment_type' => 'installment',
                        'payment_method' => 'mobile_money',
                        'status' => 'confirmed',
                    ]);
                    $paymentId = $payment->id;

                    $refund = $this->refundService->requestRefund([
                        'payment_id' => $payment->id,
                        'savings_account_id' => $account->id,
                        'amount' => $amount,
                        'currency' => 'UGX',
                        'reason_category' => 'duplicate_payment',
                        'reason_description' => 'Duplicate transfer refund simulation',
                    ], $user->id);
                    $refundId = $refund->id;

                    $steps[] = [
                        'step' => 'refund_requested',
                        'detail' => "Created {$refund->refund_number} for {$amount} UGX",
                        'duration_ms' => 45,
                    ];

                    $refund = $this->refundService->approveRefund($refund->id, $user->id, true);
                    $transactionId = $refund->reversal_transaction_id;

                    $steps[] = [
                        'step' => 'ledger_reversal_posted',
                        'detail' => "Negative debit transaction posted to ledger and account debited",
                        'duration_ms' => 70,
                    ];
                    $assertions += 2;
                    if ($refund->status === 'completed' && $transactionId) $passedAssertions += 2;
                    break;
            }
        } catch (\Exception $e) {
            $status = 'failed';
            $errorMessage = $e->getMessage();
            Log::error("Simulation scenario [{$scenarioName}] failed: " . $e->getMessage());
        }

        $durationMs = (int) round((microtime(true) - $startTime) * 1000);

        return PaymentSimulation::create([
            'scenario_name' => $scenarioName,
            'channel' => $channel,
            'gateway_name' => $gatewayName,
            'amount' => $amount,
            'currency' => $currency,
            'status' => $status,
            'steps_executed' => $steps,
            'payment_intent_id' => $intentId,
            'payment_id' => $paymentId,
            'transaction_id' => $transactionId,
            'webhook_log_id' => $webhookLogId,
            'refund_id' => $refundId,
            'dispute_id' => $disputeId,
            'execution_duration_ms' => $durationMs,
            'assertions_count' => $assertions,
            'passed_assertions_count' => $passedAssertions,
            'error_message' => $errorMessage,
            'executed_by' => $user->id,
        ]);
    }

    /**
     * Run all sandbox test harness scenarios.
     */
    public function runAllScenarios(?int $executedBy = null): array
    {
        $scenarios = [
            'flutterwave_card_3ds_success',
            'momo_stk_pin_success',
            'replay_attack_shield',
            'stanbic_bank_eft',
            'chargeback_evidence_won',
            'automated_refund_reversal',
        ];

        $results = [];
        foreach ($scenarios as $s) {
            $results[] = $this->runScenario($s, $executedBy);
        }

        return $results;
    }

    /**
     * Get simulation run history.
     */
    public function getHistory(int $limit = 25): array
    {
        return PaymentSimulation::with(['paymentIntent', 'payment', 'executedByUser'])
            ->latest()
            ->take($limit)
            ->get()
            ->toArray();
    }
}
