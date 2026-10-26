<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Payment;
use App\Models\PettyCashAccount;
use App\Models\SavingsAccount;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CashBookController extends Controller
{
    /**
     * Overall CashBook: Displays all cash inflows and outflows across the organization.
     */
    public function overallCashBook(Request $request): JsonResponse
    {
        $query = Transaction::with(['client', 'savingsAccount', 'payment', 'createdBy']);

        // Date Range Filtering
        if ($request->filled('from_date')) {
            $query->whereDate('transaction_date', '>=', $request->get('from_date'));
        }
        if ($request->filled('to_date')) {
            $query->whereDate('transaction_date', '<=', $request->get('to_date'));
        }

        // Transaction Direction (Inflow vs Outflow)
        if ($request->filled('type') && $request->get('type') !== 'all') {
            $direction = $request->get('type');
            if ($direction === 'inflow') {
                $query->whereIn('transaction_type', ['deposit', 'interest', 'plot_payment', 'inflow', 'fee']);
            } elseif ($direction === 'outflow') {
                $query->whereIn('transaction_type', ['withdrawal', 'refund', 'drawdown', 'expense', 'outflow']);
            }
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('transaction_number', 'like', "%{$search}%")
                  ->orWhere('reference_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                        ->orWhere('client_number', 'like', "%{$search}%");
                  });
            });
        }

        // Calculate Totals
        $allInflows = (float) Transaction::whereIn('transaction_type', ['deposit', 'interest', 'plot_payment', 'inflow', 'fee'])
            ->where('status', 'completed')
            ->sum('amount');

        $allOutflows = (float) Transaction::whereIn('transaction_type', ['withdrawal', 'refund', 'drawdown', 'expense', 'outflow'])
            ->where('status', 'completed')
            ->sum('amount');

        // Cash Available = Total Inflows - Total Outflows
        $cashAvailable = max(0, $allInflows - $allOutflows);

        $perPage = (int) $request->get('per_page', 20);
        $transactions = $query->latest('transaction_date')->latest('id')->paginate($perPage);

        return response()->json([
            'success' => true,
            'summary' => [
                'cash_available' => $cashAvailable,
                'total_inflow' => $allInflows,
                'total_outflow' => $allOutflows,
                'net_balance' => $cashAvailable,
            ],
            'data' => $transactions->items(),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    /**
     * Saving CashBook: Displays only client savings inflows, interest, and savings withdrawals/refunds.
     */
    public function savingCashBook(Request $request): JsonResponse
    {
        $query = Transaction::with(['client', 'savingsAccount', 'payment'])
            ->whereNotNull('account_id');

        // Date Range
        if ($request->filled('from_date')) {
            $query->whereDate('transaction_date', '>=', $request->get('from_date'));
        }
        if ($request->filled('to_date')) {
            $query->whereDate('transaction_date', '<=', $request->get('to_date'));
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('transaction_number', 'like', "%{$search}%")
                  ->orWhere('reference_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                        ->orWhere('client_number', 'like', "%{$search}%");
                  });
            });
        }

        $totalSavingsDeposits = (float) Transaction::whereNotNull('account_id')
            ->whereIn('transaction_type', ['deposit', 'interest'])
            ->where('status', 'completed')
            ->sum('amount');

        $totalSavingsWithdrawals = (float) Transaction::whereNotNull('account_id')
            ->whereIn('transaction_type', ['withdrawal', 'refund'])
            ->where('status', 'completed')
            ->sum('amount');

        $savingsAvailable = max(0, $totalSavingsDeposits - $totalSavingsWithdrawals);

        $perPage = (int) $request->get('per_page', 20);
        $transactions = $query->latest('transaction_date')->latest('id')->paginate($perPage);

        return response()->json([
            'success' => true,
            'summary' => [
                'cash_available' => $savingsAvailable,
                'total_savings_inflow' => $totalSavingsDeposits,
                'total_savings_outflow' => $totalSavingsWithdrawals,
                'active_savings_accounts' => SavingsAccount::where('status', 'active')->count(),
            ],
            'data' => $transactions->items(),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    /**
     * Add Or Draw Cash (Cash Inflow or Outflow Entry).
     */
    public function addOrDrawCash(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action_type' => 'required|in:inflow,drawdown',
            'amount' => 'required|numeric|min:1000',
            'transaction_date' => 'required|date',
            'payment_method' => 'required|string',
            'reference_number' => 'nullable|string|max:100',
            'cheque_voucher_no' => 'nullable|string|max:100',
            'bank_account' => 'nullable|string|max:100',
            'description' => 'required|string|max:500',
            'account_id' => 'nullable|exists:savings_accounts,id',
            'client_id' => 'nullable|exists:clients,id',
        ]);

        $user = $request->user();
        $isDrawdown = $validated['action_type'] === 'drawdown';

        $clientId = $validated['client_id'] ?? null;
        if (!$clientId) {
            $defaultClient = Client::firstOrCreate(
                ['client_number' => 'CL-SYSTEM-INTERNAL'],
                [
                    'uuid' => (string) Str::uuid(),
                    'first_name' => 'Fab Homes',
                    'last_name' => 'Internal Treasury',
                    'full_name' => 'Fab Homes Internal Treasury',
                    'country' => 'Uganda',
                    'phone_primary' => '+256700000000',
                    'status' => 'active',
                ]
            );
            $clientId = $defaultClient->id;
        }

        $tx = Transaction::create([
            'transaction_number' => 'TXN-' . strtoupper(Str::random(10)),
            'reference_number' => $validated['cheque_voucher_no'] ?? $validated['reference_number'] ?? ('REF-' . time()),
            'client_id' => $clientId,
            'account_id' => $validated['account_id'] ?? null,
            'transaction_type' => $isDrawdown ? 'outflow' : 'inflow',
            'amount' => $validated['amount'],
            'currency' => 'UGX',
            'balance_after' => 0, // Computed in real-time
            'transaction_date' => $validated['transaction_date'],
            'status' => 'completed',
            'description' => "[{$validated['action_type']}] " . $validated['description'],
            'created_by' => $user ? $user->id : 1,
            'metadata' => [
                'cheque_voucher_no' => $validated['cheque_voucher_no'] ?? null,
                'bank_account' => $validated['bank_account'] ?? 'Centenary Bank / Stanbic UGX',
                'payment_method' => $validated['payment_method'],
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => $isDrawdown ? 'Cash drawdown recorded successfully.' : 'Cash inflow added to CashBook.',
            'data' => $tx,
        ], 201);
    }
}
