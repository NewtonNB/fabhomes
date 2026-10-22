<?php

namespace App\Services;

use App\Models\Client;
use App\Models\ConstructionMilestone;
use App\Models\MilestoneVerification;
use App\Models\Payment;
use App\Models\PaymentIntent;
use App\Models\Project;
use App\Models\SavingsAccount;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Exception;

class ClientSavingsPortalService
{
    protected ClientAuthService $authService;

    public function __construct(ClientAuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Get Client Savings Overview & Portfolio Analytics
     */
    public function getSavingsOverview(User $user): array
    {
        $client = $this->authService->resolveOrCreateClient($user);

        $accounts = SavingsAccount::with([
            'project:id,uuid,name,code',
            'plot:id,uuid,unit_number,unit_type,status,current_price',
        ])
            ->where('client_id', $client->id)
            ->orderBy('id', 'desc')
            ->get();

        $totalBalance = (float) $accounts->sum('current_balance');
        $totalTarget = (float) $accounts->sum('target_amount');
        $totalRemaining = max(0.0, $totalTarget - $totalBalance);
        $avgProgress = $totalTarget > 0 ? round(($totalBalance / $totalTarget) * 100, 1) : 0.0;

        $landAccounts = $accounts->where('account_type', 'land_saving');
        $constructionAccounts = $accounts->where('account_type', 'construction_saving');

        // Recent deposits / credit transactions
        $accountIds = $accounts->pluck('id')->toArray();
        $recentTransactions = Transaction::where(function ($q) use ($client, $accountIds) {
            $q->where('client_id', $client->id);
            if (!empty($accountIds)) {
                $q->orWhereIn('account_id', $accountIds);
            }
        })
            ->where('transaction_type', 'credit')
            ->orderBy('transaction_date', 'desc')
            ->take(5)
            ->get()
            ->map(function ($txn) {
                return $this->formatTransactionPayload($txn);
            });

        return [
            'summary' => [
                'total_balance' => $totalBalance,
                'total_target' => $totalTarget,
                'total_remaining' => $totalRemaining,
                'average_progress_pct' => $avgProgress,
                'total_accounts_count' => $accounts->count(),
                'active_accounts_count' => $accounts->where('status', 'active')->count(),
                'completed_accounts_count' => $accounts->where('status', 'completed')->count(),
                'by_type' => [
                    'land_saving' => [
                        'count' => $landAccounts->count(),
                        'balance' => (float) $landAccounts->sum('current_balance'),
                        'target' => (float) $landAccounts->sum('target_amount'),
                    ],
                    'construction_saving' => [
                        'count' => $constructionAccounts->count(),
                        'balance' => (float) $constructionAccounts->sum('current_balance'),
                        'target' => (float) $constructionAccounts->sum('target_amount'),
                    ],
                ],
            ],
            'accounts' => $accounts->map(function ($acc) {
                return $this->formatSavingsAccountPayload($acc);
            }),
            'recent_deposits' => $recentTransactions,
        ];
    }

    /**
     * Get Details for a Specific Savings Account
     */
    public function getSavingsAccountDetails(User $user, string $identifier): array
    {
        $client = $this->authService->resolveOrCreateClient($user);

        $account = SavingsAccount::with([
            'project:id,uuid,name,code',
            'plot:id,uuid,unit_number,unit_type,status,current_price,area',
            'transactions' => function ($q) {
                $q->latest('transaction_date')->take(20);
            },
        ])
            ->where('client_id', $client->id)
            ->where(function ($q) use ($identifier) {
                if (is_numeric($identifier)) {
                    $q->where('id', (int) $identifier);
                } else {
                    $q->where('uuid', $identifier)
                        ->orWhere('account_number', $identifier);
                }
            })
            ->first();

        if (!$account) {
            throw new Exception('Savings account not found or access unauthorized.');
        }

        $formatted = $this->formatSavingsAccountPayload($account);
        $formatted['recent_transactions'] = $account->transactions->map(function ($t) {
            return $this->formatTransactionPayload($t);
        });

        return $formatted;
    }

    /**
     * Get Filtered Transaction History
     */
    public function getTransactions(User $user, array $filters = []): array
    {
        $client = $this->authService->resolveOrCreateClient($user);

        $accountIds = SavingsAccount::where('client_id', $client->id)->pluck('id')->toArray();

        $query = Transaction::with(['savingsAccount:id,uuid,account_number,scheme_name'])
            ->where(function ($q) use ($client, $accountIds) {
                $q->where('client_id', $client->id);
                if (!empty($accountIds)) {
                    $q->orWhereIn('account_id', $accountIds);
                }
            });

        // Filter by Account
        if (!empty($filters['account_id'])) {
            $accId = $filters['account_id'];
            if (!is_numeric($accId)) {
                $acc = SavingsAccount::where('uuid', $accId)->first();
                $accId = $acc ? $acc->id : 0;
            }
            $query->where('account_id', $accId);
        }

        // Filter by Transaction Type
        if (!empty($filters['transaction_type']) && $filters['transaction_type'] !== 'all') {
            $query->where('transaction_type', $filters['transaction_type']);
        }

        // Filter by Date Range
        if (!empty($filters['from_date'])) {
            $query->whereDate('transaction_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('transaction_date', '<=', $filters['to_date']);
        }

        // Search text
        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('transaction_number', 'like', $search)
                    ->orWhere('description', 'like', $search)
                    ->orWhere('reference_number', 'like', $search);
            });
        }

        $transactions = $query->orderBy('transaction_date', 'desc')
            ->take(50)
            ->get();

        return [
            'total' => $transactions->count(),
            'transactions' => $transactions->map(function ($t) {
                return $this->formatTransactionPayload($t);
            }),
        ];
    }

    /**
     * Initiate Self-Service Deposit Checkout Intent
     */
    public function initiateDeposit(User $user, array $data, Request $request): array
    {
        $client = $this->authService->resolveOrCreateClient($user);

        $accountIdentifier = $data['account_id'] ?? $data['account_uuid'] ?? null;
        if (empty($accountIdentifier)) {
            throw new Exception('Savings account selection is required.');
        }

        $account = SavingsAccount::where('client_id', $client->id)
            ->where(function ($q) use ($accountIdentifier) {
                if (is_numeric($accountIdentifier)) {
                    $q->where('id', (int) $accountIdentifier);
                } else {
                    $q->where('uuid', $accountIdentifier)
                        ->orWhere('account_number', $accountIdentifier);
                }
            })
            ->first();

        if (!$account) {
            throw new Exception('Selected savings account not found or access denied.');
        }

        $amount = (float) $data['amount'];
        if ($amount < 1000) {
            throw new Exception('Minimum deposit amount is UGX 1,000.');
        }

        $gateway = $data['gateway'] ?? 'mtn_momo';
        $phoneNumber = $data['phone_number'] ?? $client->phone_primary;

        $intentReference = 'INT-DEP-' . date('Ymd') . '-' . strtoupper(Str::random(6));

        $feeAmount = 0.00;
        $totalCharge = $amount + $feeAmount;

        $paymentIntent = PaymentIntent::create([
            'uuid' => (string) Str::uuid(),
            'intent_reference' => $intentReference,
            'client_id' => $client->id,
            'user_id' => $user->id,
            'savings_account_id' => $account->id,
            'project_id' => $account->project_id,
            'unit_id' => $account->plot_id,
            'gateway_name' => $gateway,
            'payment_method' => in_array($gateway, ['mtn_momo', 'airtel_money', 'flexipay']) ? 'mobile_money' : 'card',
            'amount' => $amount,
            'currency' => $account->currency ?: 'UGX',
            'fee_amount' => $feeAmount,
            'total_charge_amount' => $totalCharge,
            'client_phone' => $phoneNumber,
            'client_email' => $client->email,
            'client_name' => trim("{$client->first_name} {$client->last_name}"),
            'status' => 'requires_action',
            'expires_at' => now()->addHours(2),
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->header('User-Agent'), 0, 140),
            'metadata' => [
                'scheme_name' => $account->scheme_name,
                'account_number' => $account->account_number,
                'narration' => $data['narration'] ?? 'Client PWA deposit checkout',
                'source' => 'client_portal_pwa',
            ],
        ]);

        return [
            'intent_id' => $paymentIntent->id,
            'uuid' => $paymentIntent->uuid,
            'intent_reference' => $paymentIntent->intent_reference,
            'account' => [
                'id' => $account->id,
                'uuid' => $account->uuid,
                'account_number' => $account->account_number,
                'scheme_name' => $account->scheme_name,
            ],
            'gateway' => $gateway,
            'amount' => $amount,
            'currency' => $paymentIntent->currency,
            'client_phone' => $phoneNumber,
            'status' => $paymentIntent->status,
            'expires_at' => $paymentIntent->expires_at?->toIso8601String(),
            'instructions' => $this->getGatewayInstructions($gateway, $phoneNumber, $amount),
        ];
    }

    /**
     * Confirm Deposit Payment Intent & Post Real-Time Credit Ledger
     */
    public function confirmDeposit(User $user, string $intentIdentifier): array
    {
        $client = $this->authService->resolveOrCreateClient($user);

        $intent = PaymentIntent::where(function ($q) use ($intentIdentifier) {
            if (is_numeric($intentIdentifier)) {
                $q->where('id', (int) $intentIdentifier);
            } else {
                $q->where('uuid', $intentIdentifier)
                    ->orWhere('intent_reference', $intentIdentifier);
            }
        })
            ->where('client_id', $client->id)
            ->first();

        if (!$intent) {
            throw new Exception('Deposit payment intent not found.');
        }

        if ($intent->status === 'succeeded' && $intent->payment_id) {
            $existingPayment = Payment::find($intent->payment_id);
            return [
                'success' => true,
                'already_processed' => true,
                'message' => 'This deposit was already successfully processed.',
                'payment' => [
                    'payment_number' => $existingPayment?->payment_number,
                    'amount' => (float) $intent->amount,
                    'status' => 'confirmed',
                ],
            ];
        }

        return DB::transaction(function () use ($intent, $client, $user) {
            $account = SavingsAccount::lockForUpdate()->find($intent->savings_account_id);
            if (!$account) {
                throw new Exception('Associated savings account is no longer available.');
            }

            $balanceBefore = (float) $account->current_balance;
            $depositAmount = (float) $intent->amount;
            $newBalance = $balanceBefore + $depositAmount;

            // Update Account Balance
            $account->current_balance = $newBalance;
            $account->updated_by = $user->id;

            // Auto-complete if target met
            if ($newBalance >= (float) $account->target_amount && $account->status === 'active') {
                $account->status = 'completed';
            }
            $account->save();

            // Create Payment Record
            $payment = Payment::create([
                'uuid' => (string) Str::uuid(),
                'client_id' => $client->id,
                'savings_account_id' => $account->id,
                'unit_id' => $account->plot_id,
                'processed_by' => $user->id,
                'payment_type' => 'deposit',
                'payment_method' => in_array($intent->gateway_name, ['mtn_momo', 'airtel_money', 'flexipay']) ? 'mobile_money' : ($intent->gateway_name === 'stanbic_bank' ? 'bank_transfer' : 'card'),
                'status' => 'confirmed',
                'amount' => $depositAmount,
                'currency' => $intent->currency,
                'payment_date' => now()->toDateString(),
                'confirmed_at_date' => now()->toDateString(),
                'confirmed_by' => $user->id,
                'mobile_money_number' => $intent->client_phone,
                'reference_number' => $intent->intent_reference,
                'notes' => 'Self-Service PWA deposit checkout via ' . strtoupper($intent->gateway_name),
                'metadata' => [
                    'payment_intent_uuid' => $intent->uuid,
                    'scheme_name' => $account->scheme_name,
                ],
            ]);

            // Create Double-Entry Immutable Transaction
            $transaction = Transaction::create([
                'uuid' => (string) Str::uuid(),
                'account_id' => $account->id,
                'client_id' => $client->id,
                'payment_id' => $payment->id,
                'transaction_type' => 'credit',
                'amount' => $depositAmount,
                'currency' => $intent->currency,
                'balance_before' => $balanceBefore,
                'balance_after' => $newBalance,
                'description' => 'Deposit to ' . ($account->scheme_name ?: 'Savings Scheme'),
                'narration' => 'Deposit via ' . strtoupper($intent->gateway_name) . ' (' . $intent->intent_reference . ')',
                'reference_number' => $intent->intent_reference,
                'transaction_date' => now(),
                'value_date' => now()->toDateString(),
                'status' => 'posted',
                'created_by' => $user->id,
            ]);

            // Mark Intent as Succeeded
            $intent->update([
                'status' => 'succeeded',
                'succeeded_at' => now(),
                'payment_id' => $payment->id,
                'gateway_reference' => 'GW-CONF-' . strtoupper(Str::random(10)),
            ]);

            return [
                'success' => true,
                'message' => 'Deposit of ' . $intent->currency . ' ' . number_format($depositAmount, 2) . ' credited successfully!',
                'receipt' => [
                    'payment_number' => $payment->payment_number,
                    'transaction_number' => $transaction->transaction_number,
                    'intent_reference' => $intent->intent_reference,
                    'amount' => $depositAmount,
                    'currency' => $intent->currency,
                    'gateway' => $intent->gateway_name,
                    'account_number' => $account->account_number,
                    'scheme_name' => $account->scheme_name,
                    'previous_balance' => $balanceBefore,
                    'new_balance' => $newBalance,
                    'target_amount' => (float) $account->target_amount,
                    'progress_percentage' => $account->progress_percentage,
                    'status' => $account->status,
                    'timestamp' => now()->toIso8601String(),
                ],
            ];
        });
    }

    /**
     * Get Visual Milestone Progress Trackers for Client Projects/Units
     */
    public function getMilestoneProgressTrackers(User $user): array
    {
        $client = $this->authService->resolveOrCreateClient($user);

        // Fetch client's units
        $units = Unit::with(['project'])
            ->where('client_id', $client->id)
            ->get();

        // Fallback: If client has units referenced in savings accounts
        if ($units->isEmpty()) {
            $unitIds = SavingsAccount::where('client_id', $client->id)
                ->whereNotNull('plot_id')
                ->pluck('plot_id')
                ->toArray();

            if (!empty($unitIds)) {
                $units = Unit::with(['project'])
                    ->whereIn('id', $unitIds)
                    ->get();
            }
        }

        $trackers = [];

        foreach ($units as $unit) {
            $project = $unit->project;
            $milestones = $project ? ConstructionMilestone::where('project_id', $project->id)->orderBy('milestone_order')->get() : collect();

            $totalMilestones = $milestones->count();
            $completedMilestones = $milestones->where('status', 'completed')->count();
            $inProgressMilestones = $milestones->where('status', 'in_progress')->count();

            $completionPct = $totalMilestones > 0 ? round(($completedMilestones / $totalMilestones) * 100, 1) : 0.0;

            // Unit Verifications
            $verifications = MilestoneVerification::where('unit_id', $unit->id)->get();
            $latestVerification = $verifications->sortByDesc('inspection_date')->first();

            // Active milestone
            $currentMilestone = $milestones->firstWhere('status', 'in_progress')
                ?: $milestones->firstWhere('status', 'pending');

            $trackers[] = [
                'unit_id' => $unit->id,
                'unit_uuid' => $unit->uuid,
                'unit_number' => $unit->unit_number,
                'unit_name' => $unit->name,
                'unit_type' => $unit->unit_type,
                'unit_status' => $unit->status,
                'project_name' => $project?->name ?? 'Fab Homes Estate',
                'project_location' => $project?->location ?? 'Uganda',
                'total_milestones' => $totalMilestones,
                'completed_milestones' => $completedMilestones,
                'in_progress_milestones' => $inProgressMilestones,
                'completion_pct' => $completionPct,
                'current_milestone' => $currentMilestone ? [
                    'id' => $currentMilestone->id,
                    'title' => $currentMilestone->milestone_name,
                    'milestone_order' => $currentMilestone->milestone_order,
                    'target_completion_date' => $currentMilestone->planned_end_date?->format('Y-m-d'),
                    'status' => $currentMilestone->status,
                ] : null,
                'latest_verification' => $latestVerification ? [
                    'uuid' => $latestVerification->uuid,
                    'stage' => $latestVerification->stage,
                    'client_approval_status' => $latestVerification->client_approval_status,
                    'inspection_date' => $latestVerification->inspection_date?->format('Y-m-d'),
                    'qs_certified_amount' => (float) $latestVerification->qs_certified_amount,
                ] : null,
            ];
        }

        return [
            'total_units' => count($trackers),
            'trackers' => $trackers,
        ];
    }

    // --- Helper Formatters ---

    private function formatSavingsAccountPayload(SavingsAccount $acc): array
    {
        return [
            'id' => $acc->id,
            'uuid' => $acc->uuid,
            'account_number' => $acc->account_number,
            'account_type' => $acc->account_type,
            'scheme_name' => $acc->scheme_name,
            'target_amount' => (float) $acc->target_amount,
            'current_balance' => (float) $acc->current_balance,
            'remaining_amount' => (float) $acc->remaining_amount,
            'progress_percentage' => (float) $acc->progress_percentage,
            'currency' => $acc->currency ?: 'UGX',
            'status' => $acc->status,
            'opened_date' => $acc->opened_date?->format('Y-m-d'),
            'target_date' => $acc->target_date?->format('Y-m-d'),
            'project' => $acc->project ? [
                'id' => $acc->project->id,
                'uuid' => $acc->project->uuid,
                'name' => $acc->project->name,
                'code' => $acc->project->code,
            ] : null,
            'plot' => $acc->plot ? [
                'id' => $acc->plot->id,
                'uuid' => $acc->plot->uuid,
                'unit_number' => $acc->plot->unit_number,
                'unit_type' => $acc->plot->unit_type,
                'status' => $acc->plot->status,
                'price' => (float) $acc->plot->current_price,
            ] : null,
        ];
    }

    private function formatTransactionPayload(Transaction $txn): array
    {
        return [
            'id' => $txn->id,
            'uuid' => $txn->uuid,
            'transaction_number' => $txn->transaction_number,
            'account_id' => $txn->account_id,
            'transaction_type' => $txn->transaction_type,
            'amount' => (float) $txn->amount,
            'currency' => $txn->currency ?: 'UGX',
            'balance_before' => (float) $txn->balance_before,
            'balance_after' => (float) $txn->balance_after,
            'description' => $txn->description,
            'narration' => $txn->narration,
            'reference_number' => $txn->reference_number,
            'transaction_date' => $txn->transaction_date?->toIso8601String(),
            'status' => $txn->status,
        ];
    }

    private function getGatewayInstructions(string $gateway, string $phone, float $amount): string
    {
        $amtFormatted = 'UGX ' . number_format($amount);
        switch ($gateway) {
            case 'mtn_momo':
                return "A payment prompt for {$amtFormatted} has been dispatched to {$phone}. Please enter your MTN MoMo PIN on your handset to approve.";
            case 'airtel_money':
                return "An Airtel Money USSD push notification for {$amtFormatted} has been sent to {$phone}. Enter your Airtel PIN to complete deposit.";
            case 'stanbic_bank':
                return "Stanbic Bank checkout initiated for {$amtFormatted}. Please authenticate with your Stanbic App or Card 3D-Secure OTP.";
            case 'flexipay':
                return "Flexipay mobile checkout prompt dispatched for {$amtFormatted}.";
            default:
                return "Payment checkout initialized for {$amtFormatted}. Complete payment to credit your savings account.";
        }
    }
}
