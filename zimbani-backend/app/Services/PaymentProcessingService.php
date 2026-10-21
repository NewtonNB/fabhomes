<?php

namespace App\Services;

use App\Models\Client;
use App\Models\MilestoneSavingsPool;
use App\Models\Payment;
use App\Models\PaymentGatewayConfig;
use App\Models\PaymentIntent;
use App\Models\PaymentWebhookLog;
use App\Models\SavingsAccount;
use App\Services\Gateways\PaymentGatewayManager;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentProcessingService
{
    public function __construct(
        protected PaymentGatewayManager $gatewayManager
    ) {}

    /**
     * Seed Initial Uganda Payment Gateway Configurations.
     */
    public function seedInitialGateways(): void
    {
        $gateways = [
            [
                'name' => 'flutterwave',
                'display_name' => 'Flutterwave Multi-Channel (Cards, Mobile Money, Bank)',
                'provider_type' => 'aggregator',
                'is_active' => true,
                'is_default' => true,
                'environment' => 'sandbox',
                'public_key' => 'FLWPUBK_TEST-5c74291079a45610-X',
                'secret_key' => 'FLWSECK_TEST-981240182410-X',
                'webhook_secret' => 'flw_secret_test_hash',
                'api_endpoint' => 'https://api.flutterwave.com/v3',
                'supported_currencies' => ['UGX', 'USD', 'GBP', 'EUR', 'KES'],
                'supported_methods' => ['card', 'mobile_money', 'bank_transfer'],
                'transaction_fee_percentage' => 2.50,
                'flat_fee' => 0.00,
                'min_transaction_amount' => 1000.00,
                'max_transaction_amount' => 50000000.00,
                'display_order' => 1,
                'instructions' => 'Pay securely with Visa, Mastercard, MTN MoMo, or Airtel Money.',
            ],
            [
                'name' => 'pesapal',
                'display_name' => 'Pesapal Uganda (Visa, Mastercard, Mobile Money)',
                'provider_type' => 'aggregator',
                'is_active' => true,
                'is_default' => false,
                'environment' => 'sandbox',
                'public_key' => 'pesapal_consumer_key_sandbox',
                'secret_key' => 'pesapal_consumer_secret_sandbox',
                'webhook_secret' => 'pesapal_ipn_secret_123',
                'api_endpoint' => 'https://pay.pesapal.com/v3',
                'supported_currencies' => ['UGX', 'USD', 'KES'],
                'supported_methods' => ['card', 'mobile_money'],
                'transaction_fee_percentage' => 2.80,
                'flat_fee' => 0.00,
                'min_transaction_amount' => 2000.00,
                'max_transaction_amount' => 40000000.00,
                'display_order' => 2,
                'instructions' => 'Uganda and East African regional card & mobile payments.',
            ],
            [
                'name' => 'mtn_momo',
                'display_name' => 'MTN Mobile Money Direct API',
                'provider_type' => 'telco',
                'is_active' => true,
                'is_default' => false,
                'environment' => 'sandbox',
                'public_key' => 'mtn_open_api_key_sandbox',
                'secret_key' => 'mtn_api_secret_sandbox',
                'merchant_id' => 'FAB_HOMES_MOMO_UG',
                'supported_currencies' => ['UGX'],
                'supported_methods' => ['mobile_money'],
                'transaction_fee_percentage' => 1.50,
                'flat_fee' => 0.00,
                'min_transaction_amount' => 500.00,
                'max_transaction_amount' => 5000000.00,
                'display_order' => 3,
                'instructions' => 'Direct STK push to MTN Uganda numbers.',
            ],
            [
                'name' => 'airtel_money',
                'display_name' => 'Airtel Money Direct API',
                'provider_type' => 'telco',
                'is_active' => true,
                'is_default' => false,
                'environment' => 'sandbox',
                'public_key' => 'airtel_partner_key_sandbox',
                'secret_key' => 'airtel_partner_secret_sandbox',
                'merchant_id' => 'FAB_HOMES_AIRTEL_UG',
                'supported_currencies' => ['UGX'],
                'supported_methods' => ['mobile_money'],
                'transaction_fee_percentage' => 1.50,
                'flat_fee' => 0.00,
                'min_transaction_amount' => 500.00,
                'max_transaction_amount' => 5000000.00,
                'display_order' => 4,
                'instructions' => 'Direct STK push to Airtel Uganda numbers.',
            ],
            [
                'name' => 'bank_transfer',
                'display_name' => 'Stanbic Bank Direct EFT / RTGS',
                'provider_type' => 'bank',
                'is_active' => true,
                'is_default' => false,
                'environment' => 'production',
                'merchant_id' => '9030005829104',
                'supported_currencies' => ['UGX', 'USD'],
                'supported_methods' => ['bank_transfer'],
                'transaction_fee_percentage' => 0.00,
                'flat_fee' => 2500.00,
                'min_transaction_amount' => 50000.00,
                'max_transaction_amount' => 500000000.00,
                'display_order' => 5,
                'instructions' => 'Electronic Funds Transfer directly into Fab Homes Escrow Account.',
            ],
        ];

        foreach ($gateways as $gw) {
            PaymentGatewayConfig::updateOrCreate(
                ['name' => $gw['name']],
                $gw
            );
        }
    }

    /**
     * Create Dynamic Payment Intent.
     */
    public function createPaymentIntent(array $data, ?string $clientIp = null, ?string $userAgent = null): PaymentIntent
    {
        return DB::transaction(function () use ($data, $clientIp, $userAgent) {
            $gatewayName = $data['gateway_name'] ?? $this->gatewayManager->getDefaultGatewayName();
            $config = PaymentGatewayConfig::where('name', $gatewayName)->first();

            $amount = (float) $data['amount'];
            $fee = $config ? $config->calculateFee($amount) : 0.00;
            $totalCharge = $amount + $fee;

            $intent = PaymentIntent::create([
                'client_id' => $data['client_id'] ?? null,
                'user_id' => $data['user_id'] ?? (auth()->id() ?? 1),
                'company_id' => $data['company_id'] ?? 1,
                'project_id' => $data['project_id'] ?? null,
                'unit_id' => $data['unit_id'] ?? null,
                'savings_account_id' => $data['savings_account_id'] ?? null,
                'milestone_savings_pool_id' => $data['milestone_savings_pool_id'] ?? null,
                'gateway_name' => $gatewayName,
                'payment_method' => $data['payment_method'] ?? 'mobile_money',
                'amount' => $amount,
                'currency' => strtoupper($data['currency'] ?? 'UGX'),
                'fee_amount' => $fee,
                'total_charge_amount' => $totalCharge,
                'client_phone' => $data['client_phone'] ?? null,
                'client_email' => $data['client_email'] ?? null,
                'client_name' => $data['client_name'] ?? null,
                'status' => 'requires_payment_method',
                'ip_address' => $clientIp,
                'user_agent' => $userAgent,
                'metadata' => $data['metadata'] ?? [],
            ]);

            // Dispatch to adapter
            $adapter = $this->gatewayManager->driver($gatewayName);
            $initResult = $adapter->initiatePayment($intent);

            $intent->update([
                'status' => $initResult['status'] ?? 'requires_action',
                'gateway_reference' => $initResult['gateway_reference'] ?? null,
                'gateway_checkout_url' => $initResult['checkout_url'] ?? null,
                'gateway_response' => $initResult,
            ]);

            return $intent->fresh(['client', 'project', 'unit', 'savingsAccount', 'milestoneSavingsPool']);
        });
    }

    /**
     * Confirm Payment Intent & Atomically Post to Ledger.
     */
    public function confirmPaymentIntent(string $identifier, array $confirmationData = []): PaymentIntent
    {
        return DB::transaction(function () use ($identifier, $confirmationData) {
            $intent = PaymentIntent::where('uuid', $identifier)
                ->orWhere('id', $identifier)
                ->orWhere('intent_reference', $identifier)
                ->lockForUpdate()
                ->firstOrFail();

            if ($intent->status === 'succeeded') {
                return $intent; // Already completed idempotently
            }

            $adapter = $this->gatewayManager->driver($intent->gateway_name);
            $verifyResult = $adapter->verifyPayment($intent);

            // Record official Payment record in payments table
            $paymentCount = Payment::whereYear('created_at', date('Y'))->count() + 1;
            $paymentNumber = sprintf('PAY-%s%02d-%04d', date('Y'), date('m'), $paymentCount);

            $payment = Payment::create([
                'payment_number' => $paymentNumber,
                'reference_number' => $intent->intent_reference,
                'unit_id' => $intent->unit_id,
                'client_id' => $intent->client_id,
                'savings_account_id' => $intent->savings_account_id,
                'processed_by' => auth()->id() ?? 1,
                'payment_type' => 'installment',
                'payment_method' => $intent->payment_method,
                'status' => 'confirmed',
                'amount' => $intent->amount,
                'currency' => $intent->currency,
                'total_amount' => $intent->total_charge_amount,
                'payment_date' => now()->toDateString(),
                'confirmed_at_date' => now(),
                'transaction_id' => $intent->gateway_reference,
                'mobile_money_number' => $intent->client_phone,
                'notes' => 'Settled via ' . strtoupper($intent->gateway_name),
            ]);

            // Credit Client Savings Account if attached
            if ($intent->savings_account_id) {
                $account = SavingsAccount::find($intent->savings_account_id);
                if ($account) {
                    $account->increment('current_balance', $intent->amount);
                }
            }

            // Waterfall to Milestone Savings Pool if specified
            if ($intent->milestone_savings_pool_id) {
                $pool = MilestoneSavingsPool::find($intent->milestone_savings_pool_id);
                if ($pool) {
                    $pool->increment('current_amount', $intent->amount);
                    if ($pool->current_amount >= $pool->target_amount) {
                        $pool->update(['status' => 'funded', 'completed_at' => now()]);
                    }
                }
            }

            $intent->update([
                'status' => 'succeeded',
                'payment_id' => $payment->id,
                'succeeded_at' => now(),
                'gateway_response' => array_merge($intent->gateway_response ?? [], $verifyResult, $confirmationData),
            ]);

            return $intent->fresh(['client', 'project', 'unit', 'savingsAccount', 'milestoneSavingsPool', 'payment']);
        });
    }

    /**
     * Cancel Payment Intent.
     */
    public function cancelPaymentIntent(string $identifier, string $reason = 'Cancelled by user'): PaymentIntent
    {
        $intent = PaymentIntent::where('uuid', $identifier)
            ->orWhere('id', $identifier)
            ->firstOrFail();

        $intent->update([
            'status' => 'cancelled',
            'failure_reason' => $reason,
        ]);

        return $intent;
    }

    /**
     * Handle Gateway Webhook with Idempotency.
     */
    public function handleWebhook(string $gatewayName, array $payload, array $headers): array
    {
        $adapter = $this->gatewayManager->driver($gatewayName);

        if (!$adapter->validateWebhook($payload, $headers)) {
            Log::warning("Unauthorized webhook payload for gateway [{$gatewayName}]", ['headers' => $headers]);
            return ['success' => false, 'message' => 'Invalid webhook signature'];
        }

        $parsed = $adapter->parseWebhookPayload($payload);
        $intentRef = $parsed['intent_reference'] ?? null;

        if ($intentRef) {
            $intent = PaymentIntent::where('intent_reference', $intentRef)->first();
            if ($intent && $parsed['status'] === 'succeeded') {
                $this->confirmPaymentIntent($intent->id, $parsed);
            }
        }

        // Telemetry logging
        PaymentWebhookLog::create([
            'provider' => $gatewayName,
            'event_type' => $parsed['event'] ?? 'transaction.event',
            'external_id' => $parsed['gateway_reference'] ?? null,
            'payload' => $payload,
            'headers' => $headers,
            'status' => 'processed',
            'ip_address' => request()->ip() ?? '127.0.0.1',
        ]);

        return [
            'success' => true,
            'message' => 'Webhook received and processed idempotently',
            'parsed' => $parsed,
        ];
    }

    /**
     * Get Configured Payment Gateways.
     */
    public function getGatewayConfigs(): array
    {
        return PaymentGatewayConfig::active()->get()->toArray();
    }

    /**
     * Get Payment Intents with Filtering.
     */
    public function getPaymentIntents(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = PaymentIntent::with(['client', 'project', 'unit', 'savingsAccount', 'payment'])
            ->latest();

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['gateway_name'])) {
            $query->where('gateway_name', $filters['gateway_name']);
        }

        if (!empty($filters['client_id'])) {
            $query->where('client_id', $filters['client_id']);
        }

        return $query->paginate($perPage);
    }

    /**
     * Get Global Payment Statistics.
     */
    public function getStatistics(): array
    {
        $totalVolume = (float) PaymentIntent::where('status', 'succeeded')->sum('amount');
        $totalFees = (float) PaymentIntent::where('status', 'succeeded')->sum('fee_amount');
        $totalSuccessful = PaymentIntent::where('status', 'succeeded')->count();
        $totalFailed = PaymentIntent::where('status', 'failed')->count();
        $totalProcessing = PaymentIntent::whereIn('status', ['processing', 'requires_action'])->count();

        $byMethod = PaymentIntent::where('status', 'succeeded')
            ->select('payment_method', DB::raw('count(*) as count'), DB::raw('sum(amount) as volume'))
            ->groupBy('payment_method')
            ->get()
            ->keyBy('payment_method');

        $byGateway = PaymentIntent::where('status', 'succeeded')
            ->select('gateway_name', DB::raw('count(*) as count'), DB::raw('sum(amount) as volume'))
            ->groupBy('gateway_name')
            ->get()
            ->keyBy('gateway_name');

        return [
            'total_volume' => $totalVolume,
            'total_fees' => $totalFees,
            'successful_transactions_count' => $totalSuccessful,
            'failed_transactions_count' => $totalFailed,
            'pending_transactions_count' => $totalProcessing,
            'success_rate_percentage' => ($totalSuccessful + $totalFailed) > 0
                ? round(($totalSuccessful / ($totalSuccessful + $totalFailed)) * 100, 1)
                : 100.0,
            'by_payment_method' => $byMethod,
            'by_gateway' => $byGateway,
        ];
    }
}
