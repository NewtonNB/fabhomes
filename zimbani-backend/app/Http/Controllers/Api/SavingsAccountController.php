<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdjustBalanceRequest;
use App\Http\Requests\StoreSavingsAccountRequest;
use App\Http\Requests\UpdateSavingsAccountRequest;
use App\Http\Resources\SavingsAccountResource;
use App\Models\Client;
use App\Models\SavingsAccount;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class SavingsAccountController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a paginated listing of client savings accounts.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', SavingsAccount::class);

        $query = SavingsAccount::with(['client', 'plot', 'project', 'createdBy']);

        // Client scope (for client portal or filter)
        if ($request->user()->hasRole('Client') && $request->user()->client) {
            $query->where('client_id', $request->user()->client->id);
        } elseif ($request->filled('client_id')) {
            $clientId = $request->client_id;
            if (is_numeric($clientId)) {
                $query->where('client_id', $clientId);
            } else {
                $client = Client::where('uuid', $clientId)->first();
                if ($client) {
                    $query->where('client_id', $client->id);
                }
            }
        }

        // Account Type
        if ($request->filled('account_type')) {
            $query->where('account_type', $request->account_type);
        }

        // Status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Project filter
        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        // Plot filter
        if ($request->filled('plot_id')) {
            $query->where('plot_id', $request->plot_id);
        }

        // Search by account number, scheme name, or client name
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('account_number', 'like', "%{$search}%")
                  ->orWhere('scheme_name', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('first_name', 'like', "%{$search}%")
                         ->orWhere('last_name', 'like', "%{$search}%")
                         ->orWhere('client_number', 'like', "%{$search}%")
                         ->orWhere('phone', 'like', "%{$search}%");
                  });
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = strtolower($request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        if (in_array($sortBy, ['created_at', 'account_number', 'current_balance', 'target_amount', 'opened_date', 'target_date'])) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 15)));
        $accounts = $query->paginate($perPage);

        return SavingsAccountResource::collection($accounts);
    }

    /**
     * Store a newly created savings account.
     */
    public function store(StoreSavingsAccountRequest $request): JsonResponse
    {
        $this->authorize('create', SavingsAccount::class);

        $clientId = $request->getClientId();
        $plotId = $request->getPlotId();
        $projectId = $request->getProjectId();

        $account = SavingsAccount::create([
            'client_id' => $clientId,
            'account_type' => $request->account_type,
            'scheme_name' => $request->scheme_name,
            'group_code' => $request->group_code,
            'cohort_year' => $request->cohort_year,
            'package_code' => $request->package_code,
            'target_amount' => $request->target_amount,
            'current_balance' => 0.00,
            'currency' => $request->currency ?? 'UGX',
            'status' => 'active',
            'opened_date' => $request->opened_date ?? now()->toDateString(),
            'target_date' => $request->target_date,
            'plot_id' => $plotId,
            'project_id' => $projectId,
            'notes' => $request->notes,
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => 'Savings account opened successfully',
            'data' => new SavingsAccountResource($account->load(['client', 'plot', 'project', 'createdBy'])),
        ], 201);
    }

    /**
     * Display the specified savings account.
     */
    public function show(SavingsAccount $savingsAccount): JsonResponse
    {
        $this->authorize('view', $savingsAccount);

        $savingsAccount->load([
            'client',
            'plot',
            'project',
            'createdBy',
            'updatedBy',
            'payments' => function ($q) {
                $q->latest()->limit(10);
            },
            'documents',
        ]);

        return response()->json([
            'data' => new SavingsAccountResource($savingsAccount),
        ]);
    }

    /**
     * Update the specified savings account.
     */
    public function update(UpdateSavingsAccountRequest $request, SavingsAccount $savingsAccount): JsonResponse
    {
        $this->authorize('update', $savingsAccount);

        $data = $request->only([
            'account_type',
            'scheme_name',
            'group_code',
            'cohort_year',
            'package_code',
            'target_amount',
            'status',
            'opened_date',
            'target_date',
            'closed_date',
            'notes',
        ]);

        if ($request->has('plot_id')) {
            $data['plot_id'] = $request->getPlotId();
        }

        if ($request->has('project_id')) {
            $data['project_id'] = $request->getProjectId();
        }

        $data['updated_by'] = auth()->id();

        $savingsAccount->update($data);

        return response()->json([
            'message' => 'Savings account updated successfully',
            'data' => new SavingsAccountResource($savingsAccount->fresh(['client', 'plot', 'project', 'updatedBy'])),
        ]);
    }

    /**
     * Remove the specified savings account from storage.
     */
    public function destroy(SavingsAccount $savingsAccount): JsonResponse
    {
        $this->authorize('delete', $savingsAccount);

        // Financial safety check: Cannot delete account with non-zero balance
        if ($savingsAccount->current_balance > 0) {
            return response()->json([
                'message' => 'Cannot delete a savings account with an active balance. Please disburse or transfer remaining funds first.',
            ], 422);
        }

        $savingsAccount->delete();

        return response()->json([
            'message' => 'Savings account deleted successfully',
        ]);
    }

    /**
     * Activate a suspended account.
     */
    public function activate(SavingsAccount $savingsAccount): JsonResponse
    {
        $this->authorize('activate', $savingsAccount);

        $savingsAccount->activate();

        return response()->json([
            'message' => 'Savings account successfully activated',
            'data' => new SavingsAccountResource($savingsAccount->fresh()),
        ]);
    }

    /**
     * Suspend an active savings account.
     */
    public function suspend(Request $request, SavingsAccount $savingsAccount): JsonResponse
    {
        $this->authorize('suspend', $savingsAccount);

        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $savingsAccount->suspend($request->reason);

        return response()->json([
            'message' => 'Savings account suspended',
            'data' => new SavingsAccountResource($savingsAccount->fresh()),
        ]);
    }

    /**
     * Close a savings account.
     */
    public function close(Request $request, SavingsAccount $savingsAccount): JsonResponse
    {
        $this->authorize('close', $savingsAccount);

        $request->validate([
            'notes' => 'nullable|string|max:500',
        ]);

        $savingsAccount->close($request->notes);

        return response()->json([
            'message' => 'Savings account closed successfully',
            'data' => new SavingsAccountResource($savingsAccount->fresh()),
        ]);
    }

    /**
     * Adjust savings account balance manually (Finance Manager authority).
     */
    public function adjustBalance(AdjustBalanceRequest $request, SavingsAccount $savingsAccount): JsonResponse
    {
        $this->authorize('adjustBalance', $savingsAccount);

        $type = $request->adjustment_type;
        $amount = (float) $request->amount;
        $current = (float) $savingsAccount->current_balance;

        $delta = match ($type) {
            'credit' => $amount,
            'debit' => -1 * min($current, $amount),
            'set_exact' => $amount - $current,
        };

        if ($delta != 0) {
            \App\Models\Transaction::record([
                'account_id' => $savingsAccount->id,
                'client_id' => $savingsAccount->client_id,
                'transaction_type' => 'adjustment',
                'amount' => $delta,
                'currency' => $savingsAccount->currency,
                'description' => $request->reason ?? 'Manual balance adjustment',
                'narration' => $request->notes,
                'created_by' => auth()->id(),
            ]);
        }

        return response()->json([
            'message' => 'Account balance successfully adjusted and recorded in ledger',
            'data' => new SavingsAccountResource($savingsAccount->fresh(['client', 'payments'])),
        ]);
    }

    /**
     * Get account statement summary.
     */
    public function statement(SavingsAccount $savingsAccount): JsonResponse
    {
        $this->authorize('statement', $savingsAccount);

        $savingsAccount->load([
            'client',
            'plot',
            'project',
            'payments' => function ($q) {
                $q->latest('payment_date');
            },
        ]);

        $totalDeposited = $savingsAccount->payments()
            ->whereIn('status', ['confirmed', 'verified'])
            ->sum('amount');

        return response()->json([
            'data' => [
                'account' => new SavingsAccountResource($savingsAccount),
                'total_deposited' => (float) $totalDeposited,
                'target_amount' => (float) $savingsAccount->target_amount,
                'current_balance' => (float) $savingsAccount->current_balance,
                'progress_percentage' => (float) $savingsAccount->progress_percentage,
                'transactions_count' => $savingsAccount->payments->count(),
                'recent_payments' => $savingsAccount->payments,
            ],
        ]);
    }

    /**
     * Get savings accounts portfolio statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SavingsAccount::class);

        $clientId = $request->client_id;
        $query = SavingsAccount::query();

        if ($request->user()->hasRole('Client') && $request->user()->client) {
            $query->where('client_id', $request->user()->client->id);
        } elseif ($clientId) {
            if (is_numeric($clientId)) {
                $query->where('client_id', $clientId);
            } else {
                $c = Client::where('uuid', $clientId)->first();
                if ($c) $query->where('client_id', $c->id);
            }
        }

        $totalAccounts = (clone $query)->count();
        $activeAccounts = (clone $query)->where('status', 'active')->count();
        $completedAccounts = (clone $query)->where('status', 'completed')->count();
        $suspendedAccounts = (clone $query)->where('status', 'suspended')->count();
        $closedAccounts = (clone $query)->where('status', 'closed')->count();

        $totalBalance = (float) (clone $query)->sum('current_balance');
        $totalTarget = (float) (clone $query)->sum('target_amount');

        $landAccounts = (clone $query)->where('account_type', 'land_saving')->count();
        $landBalance = (float) (clone $query)->where('account_type', 'land_saving')->sum('current_balance');

        $constructionAccounts = (clone $query)->where('account_type', 'construction_saving')->count();
        $constructionBalance = (float) (clone $query)->where('account_type', 'construction_saving')->sum('current_balance');

        $tuzimbeAccounts = (clone $query)->where('account_type', 'tuzimbe_group')->count();
        $tuzimbeBalance = (float) (clone $query)->where('account_type', 'tuzimbe_group')->sum('current_balance');

        $overallProgress = $totalTarget > 0 ? round(($totalBalance / $totalTarget) * 100, 1) : 0;

        return response()->json([
            'data' => [
                'total_accounts' => $totalAccounts,
                'active_accounts' => $activeAccounts,
                'completed_accounts' => $completedAccounts,
                'suspended_accounts' => $suspendedAccounts,
                'closed_accounts' => $closedAccounts,
                'total_balance_ugx' => $totalBalance,
                'total_target_ugx' => $totalTarget,
                'overall_progress_percentage' => $overallProgress,
                'land_savings' => [
                    'count' => $landAccounts,
                    'balance_ugx' => $landBalance,
                ],
                'construction_savings' => [
                    'count' => $constructionAccounts,
                    'balance_ugx' => $constructionBalance,
                ],
                'tuzimbe_group' => [
                    'count' => $tuzimbeAccounts,
                    'balance_ugx' => $tuzimbeBalance,
                ],
            ],
        ]);
    }
}
