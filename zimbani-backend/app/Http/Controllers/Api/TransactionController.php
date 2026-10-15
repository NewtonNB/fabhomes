<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReverseTransactionRequest;
use App\Http\Requests\StoreTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Client;
use App\Models\Payment;
use App\Models\SavingsAccount;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    /**
     * Display a listing of financial transactions (ledger).
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Transaction::class);

        $query = Transaction::query()->with([
            'client',
            'savingsAccount',
            'payment',
            'createdBy',
        ]);

        // If authenticated user is a client, restrict to their transactions
        if ($request->user()->hasRole('Client') && $request->user()->client) {
            $query->where('client_id', $request->user()->client->id);
        } elseif ($request->filled('client_id')) {
            $clientId = $request->client_id;
            if (!is_numeric($clientId)) {
                $client = Client::where('uuid', $clientId)->first();
                $clientId = $client ? $client->id : null;
            }
            if ($clientId) {
                $query->where('client_id', $clientId);
            }
        }

        // Filter by Savings Account
        if ($request->filled('account_id')) {
            $accountId = $request->account_id;
            if (!is_numeric($accountId)) {
                $account = SavingsAccount::where('uuid', $accountId)->first();
                $accountId = $account ? $account->id : null;
            }
            if ($accountId) {
                $query->where('account_id', $accountId);
            }
        }

        // Filter by Payment
        if ($request->filled('payment_id')) {
            $paymentId = $request->payment_id;
            if (!is_numeric($paymentId)) {
                $payment = Payment::where('uuid', $paymentId)->first();
                $paymentId = $payment ? $payment->id : null;
            }
            if ($paymentId) {
                $query->where('payment_id', $paymentId);
            }
        }

        // Filter by Transaction Type
        if ($request->filled('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        // Filter by Status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by Date Range
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('transaction_date', [$request->start_date . ' 00:00:00', $request->end_date . ' 23:59:59']);
        } elseif ($request->filled('start_date')) {
            $query->where('transaction_date', '>=', $request->start_date . ' 00:00:00');
        } elseif ($request->filled('end_date')) {
            $query->where('transaction_date', '<=', $request->end_date . ' 23:59:59');
        }

        // Filter Flow (Credit vs Debit)
        if ($request->filled('flow')) {
            if ($request->flow === 'credit') {
                $query->where('amount', '>', 0);
            } elseif ($request->flow === 'debit') {
                $query->where('amount', '<', 0);
            }
        }

        // Search Keyword
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('transaction_number', 'like', "%{$search}%")
                  ->orWhere('reference_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('first_name', 'like', "%{$search}%")
                         ->orWhere('last_name', 'like', "%{$search}%")
                         ->orWhere('client_number', 'like', "%{$search}%");
                  });
            });
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'transaction_date');
        $sortOrder = $request->get('sort_order', 'desc');
        $allowedSorts = ['transaction_date', 'amount', 'balance_after', 'created_at'];

        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->latest('transaction_date');
        }

        $perPage = min((int) $request->get('per_page', 25), 100);
        $transactions = $query->paginate($perPage);

        return response()->json([
            'data' => TransactionResource::collection($transactions),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    /**
     * Store a newly created transaction in the ledger.
     */
    public function store(StoreTransactionRequest $request): JsonResponse
    {
        $this->authorize('create', Transaction::class);

        $clientId = $request->getClientId();
        if (!$clientId) {
            return response()->json(['message' => 'Invalid or non-existent client specified.'], 422);
        }

        $accountId = $request->getAccountId();
        $paymentId = $request->getPaymentId();

        $transaction = Transaction::record([
            'account_id' => $accountId,
            'client_id' => $clientId,
            'payment_id' => $paymentId,
            'transaction_type' => $request->transaction_type,
            'amount' => (float) $request->amount,
            'currency' => $request->currency ?? 'UGX',
            'description' => $request->description,
            'narration' => $request->narration,
            'reference_number' => $request->reference_number,
            'transaction_date' => $request->transaction_date ?? now(),
            'value_date' => $request->value_date ?? now()->toDateString(),
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => 'Transaction successfully recorded in the immutable ledger.',
            'data' => new TransactionResource($transaction->load(['client', 'savingsAccount', 'payment', 'createdBy'])),
        ], 201);
    }

    /**
     * Display the specified transaction.
     */
    public function show(Transaction $transaction): JsonResponse
    {
        $this->authorize('view', $transaction);

        $transaction->load([
            'client',
            'savingsAccount',
            'payment',
            'relatedTransaction',
            'reversals',
            'createdBy',
            'reversedBy',
            'documents',
        ]);

        return response()->json([
            'data' => new TransactionResource($transaction),
        ]);
    }

    /**
     * Reverse a posted transaction in accordance with immutable audit principles.
     */
    public function reverse(ReverseTransactionRequest $request, Transaction $transaction): JsonResponse
    {
        $this->authorize('reverse', $transaction);

        try {
            $reversal = $transaction->reverse(auth()->id(), $request->reason);

            return response()->json([
                'message' => "Transaction {$transaction->transaction_number} was successfully reversed.",
                'data' => [
                    'original_transaction' => new TransactionResource($transaction->fresh()),
                    'reversal_transaction' => new TransactionResource($reversal->load(['client', 'savingsAccount', 'createdBy'])),
                ],
            ]);
        } catch (\DomainException|\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Automated Ledger Reconciliation Check.
     * Verifies stored account balances against the transaction history sum.
     */
    public function reconciliation(Request $request): JsonResponse
    {
        $this->authorize('reconcile', Transaction::class);

        // Group-by check comparing stored balance vs sum of posted transactions
        $results = DB::table('savings_accounts as a')
            ->join('clients as c', 'c.id', '=', 'a.client_id')
            ->leftJoin('transactions as t', function ($join) {
                $join->on('t.account_id', '=', 'a.id')
                     ->whereIn('t.status', ['posted', 'reversed']);
            })
            ->select(
                'a.id',
                'a.uuid',
                'a.account_number',
                'a.scheme_name',
                'a.current_balance as stored_balance',
                'c.first_name',
                'c.last_name',
                DB::raw('COALESCE(SUM(t.amount), 0) as calculated_balance'),
                DB::raw('ROUND(a.current_balance - COALESCE(SUM(t.amount), 0), 2) as difference')
            )
            ->whereNull('a.deleted_at')
            ->groupBy(
                'a.id',
                'a.uuid',
                'a.account_number',
                'a.scheme_name',
                'a.current_balance',
                'c.first_name',
                'c.last_name'
            )
            ->get();

        $discrepancies = $results->filter(function ($item) {
            return abs((float) $item->difference) > 0.01;
        })->values();

        $totalAccounts = $results->count();
        $discrepancyCount = $discrepancies->count();

        return response()->json([
            'data' => [
                'total_accounts_checked' => $totalAccounts,
                'matched_count' => $totalAccounts - $discrepancyCount,
                'discrepancy_count' => $discrepancyCount,
                'is_healthy' => $discrepancyCount === 0,
                'discrepancies' => $discrepancies,
                'verified_at' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * Ledger statistics and flow breakdown.
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Transaction::class);

        $base = Transaction::query();

        if ($request->filled('client_id')) {
            $clientId = $request->client_id;
            if (!is_numeric($clientId)) {
                $client = Client::where('uuid', $clientId)->first();
                $clientId = $client ? $client->id : null;
            }
            if ($clientId) {
                $base->where('client_id', $clientId);
            }
        }

        if ($request->filled('account_id')) {
            $accountId = $request->account_id;
            if (!is_numeric($accountId)) {
                $account = SavingsAccount::where('uuid', $accountId)->first();
                $accountId = $account ? $account->id : null;
            }
            if ($accountId) {
                $base->where('account_id', $accountId);
            }
        }

        $totalPosted = (clone $base)->where('status', 'posted')->count();
        $totalInflow = (clone $base)->where('status', 'posted')->where('amount', '>', 0)->sum('amount');
        $totalOutflow = abs((float) (clone $base)->where('status', 'posted')->where('amount', '<', 0)->sum('amount'));
        $totalReversals = (clone $base)->where('status', 'reversed')->count();

        $today = now()->toDateString();
        $todayCount = (clone $base)->whereDate('transaction_date', $today)->count();
        $todayVolume = (clone $base)->whereDate('transaction_date', $today)->sum(DB::raw('ABS(amount)'));

        $byType = (clone $base)->where('status', 'posted')
            ->select('transaction_type', DB::raw('count(*) as count'), DB::raw('sum(amount) as total_amount'))
            ->groupBy('transaction_type')
            ->get();

        return response()->json([
            'data' => [
                'total_transactions' => $totalPosted,
                'total_inflow' => (float) $totalInflow,
                'total_outflow' => (float) $totalOutflow,
                'net_movement' => (float) ($totalInflow - $totalOutflow),
                'total_reversals' => $totalReversals,
                'today_transactions' => $todayCount,
                'today_volume' => (float) $todayVolume,
                'breakdown_by_type' => $byType,
            ],
        ]);
    }
}
