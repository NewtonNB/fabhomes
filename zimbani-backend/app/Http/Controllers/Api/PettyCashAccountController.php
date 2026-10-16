<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePettyCashAccountRequest;
use App\Http\Requests\TopUpPettyCashRequest;
use App\Http\Resources\PettyCashAccountResource;
use App\Http\Resources\PettyCashTransactionResource;
use App\Models\PettyCashAccount;
use App\Models\Project;
use App\Models\Site;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PettyCashAccountController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a paginated listing of petty cash accounts.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', PettyCashAccount::class);

        $query = PettyCashAccount::with(['project', 'site', 'custodian', 'createdBy']);

        // Site Manager scope: view accounts where custodian or site matches
        if ($request->user()->hasRole('Site Manager') && !$request->user()->hasAnyRole(['Super Admin', 'Company Admin', 'Finance Officer'])) {
            $query->where(function ($q) use ($request) {
                $q->where('custodian_id', $request->user()->id)
                  ->orWhereHas('site', function ($sq) use ($request) {
                      $sq->where('manager_id', $request->user()->id);
                  });
            });
        }

        // Project filter
        if ($request->filled('project_id')) {
            $projectId = $request->project_id;
            if (is_numeric($projectId)) {
                $query->where('project_id', $projectId);
            } else {
                $project = Project::where('uuid', $projectId)->first();
                if ($project) {
                    $query->where('project_id', $project->id);
                }
            }
        }

        // Site filter
        if ($request->filled('site_id')) {
            $siteId = $request->site_id;
            if (is_numeric($siteId)) {
                $query->where('site_id', $siteId);
            } else {
                $site = Site::where('uuid', $siteId)->first();
                if ($site) {
                    $query->where('site_id', $site->id);
                }
            }
        }

        // Custodian filter
        if ($request->filled('custodian_id')) {
            $custodianId = $request->custodian_id;
            if (is_numeric($custodianId)) {
                $query->where('custodian_id', $custodianId);
            } else {
                $user = User::where('uuid', $custodianId)->first();
                if ($user) {
                    $query->where('custodian_id', $user->id);
                }
            }
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Search query
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('account_number', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhereHas('custodian', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  })
                  ->orWhereHas('site', function ($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = strtolower($request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        if (in_array($sortBy, ['created_at', 'account_number', 'name', 'float_limit', 'current_balance', 'status'])) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 15)));
        $accounts = $query->paginate($perPage);

        return PettyCashAccountResource::collection($accounts);
    }

    /**
     * Store a newly created petty cash account.
     */
    public function store(StorePettyCashAccountRequest $request): JsonResponse
    {
        $this->authorize('create', PettyCashAccount::class);

        $custodianId = $request->getCustodianId();
        if (!$custodianId) {
            return response()->json(['message' => 'Valid custodian user required.'], 422);
        }

        $account = PettyCashAccount::create([
            'name' => $request->name,
            'project_id' => $request->getProjectId(),
            'site_id' => $request->getSiteId(),
            'custodian_id' => $custodianId,
            'float_limit' => $request->float_limit,
            'current_balance' => 0.00,
            'currency' => $request->currency ?? 'UGX',
            'status' => 'active',
            'notes' => $request->notes,
            'created_by' => auth()->id(),
        ]);

        // Optional initial balance top up
        $initialBalance = (float) $request->input('initial_balance', 0.00);
        if ($initialBalance > 0) {
            $account->topUp($initialBalance, 'Initial float allocation upon account opening', null, auth()->user());
        }

        return response()->json([
            'message' => 'Petty cash account created successfully',
            'data' => new PettyCashAccountResource($account->load(['project', 'site', 'custodian', 'createdBy'])),
        ], 201);
    }

    /**
     * Display the specified petty cash account.
     */
    public function show(PettyCashAccount $pettyCashAccount): JsonResponse
    {
        $this->authorize('view', $pettyCashAccount);

        $pettyCashAccount->load([
            'project',
            'site',
            'custodian',
            'createdBy',
            'updatedBy',
            'transactions.createdBy',
            'expenseClaims' => function ($q) {
                $q->latest()->limit(10);
            },
            'documents',
        ]);

        return response()->json([
            'data' => new PettyCashAccountResource($pettyCashAccount),
        ]);
    }

    /**
     * Update the specified petty cash account.
     */
    public function update(Request $request, PettyCashAccount $pettyCashAccount): JsonResponse
    {
        $this->authorize('update', $pettyCashAccount);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'float_limit' => 'sometimes|required|numeric|min:0',
            'status' => 'sometimes|required|in:active,suspended,closed',
            'notes' => 'nullable|string',
        ]);

        $data = $request->only(['name', 'float_limit', 'status', 'notes']);
        if ($request->filled('custodian_id')) {
            $id = $request->custodian_id;
            $user = is_numeric($id) ? User::find($id) : User::where('uuid', $id)->first();
            if ($user) $data['custodian_id'] = $user->id;
        }

        $data['updated_by'] = auth()->id();
        $pettyCashAccount->update($data);

        return response()->json([
            'message' => 'Petty cash account updated successfully',
            'data' => new PettyCashAccountResource($pettyCashAccount->fresh(['project', 'site', 'custodian'])),
        ]);
    }

    /**
     * Delete petty cash account.
     */
    public function destroy(PettyCashAccount $pettyCashAccount): JsonResponse
    {
        $this->authorize('delete', $pettyCashAccount);

        if ($pettyCashAccount->current_balance > 0) {
            return response()->json([
                'message' => 'Cannot delete a petty cash account with an active float balance. Please disburse or return remaining funds to treasury first.',
            ], 422);
        }

        if ($pettyCashAccount->transactions()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete an account with transaction history. Close or suspend the account instead.',
            ], 422);
        }

        $pettyCashAccount->delete();

        return response()->json(['message' => 'Petty cash account deleted successfully']);
    }

    /**
     * Top-up / Replenish float account.
     */
    public function topUp(TopUpPettyCashRequest $request, PettyCashAccount $pettyCashAccount): JsonResponse
    {
        $this->authorize('topUp', $pettyCashAccount);

        if ($pettyCashAccount->status !== 'active') {
            return response()->json(['message' => 'Cannot top up an inactive or closed petty cash account.'], 422);
        }

        $txn = $pettyCashAccount->topUp(
            (float) $request->amount,
            $request->description,
            $request->reference_number,
            auth()->user()
        );

        return response()->json([
            'message' => 'Petty cash float topped up successfully',
            'data' => [
                'account' => new PettyCashAccountResource($pettyCashAccount->fresh(['project', 'site', 'custodian'])),
                'transaction' => new PettyCashTransactionResource($txn->load('createdBy')),
            ],
        ]);
    }

    /**
     * Return surplus float funds to main treasury.
     */
    public function returnFunds(Request $request, PettyCashAccount $pettyCashAccount): JsonResponse
    {
        $this->authorize('reconcile', $pettyCashAccount);

        $request->validate([
            'amount' => 'required|numeric|min:1',
            'reason' => 'required|string|max:255',
            'reference_number' => 'nullable|string|max:100',
        ]);

        try {
            $txn = $pettyCashAccount->returnFunds(
                (float) $request->amount,
                $request->reason,
                $request->input('reference_number'),
                auth()->user()
            );

            return response()->json([
                'message' => 'Float funds returned to treasury successfully',
                'data' => [
                    'account' => new PettyCashAccountResource($pettyCashAccount->fresh(['project', 'site', 'custodian'])),
                    'transaction' => new PettyCashTransactionResource($txn->load('createdBy')),
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * List transaction history for a specific float.
     */
    public function transactions(Request $request, PettyCashAccount $pettyCashAccount): AnonymousResourceCollection
    {
        $this->authorize('view', $pettyCashAccount);

        $query = $pettyCashAccount->transactions()->with(['createdBy']);

        if ($request->filled('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 20)));
        return PettyCashTransactionResource::collection($query->paginate($perPage));
    }

    /**
     * Statistics for petty cash floats.
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', PettyCashAccount::class);

        $query = PettyCashAccount::query();

        if ($request->filled('project_id')) {
            $projectId = $request->project_id;
            if (is_numeric($projectId)) {
                $query->where('project_id', $projectId);
            } else {
                $project = Project::where('uuid', $projectId)->first();
                if ($project) $query->where('project_id', $project->id);
            }
        }

        if ($request->filled('site_id')) {
            $siteId = $request->site_id;
            if (is_numeric($siteId)) {
                $query->where('site_id', $siteId);
            } else {
                $site = Site::where('uuid', $siteId)->first();
                if ($site) $query->where('site_id', $site->id);
            }
        }

        $totalAccounts = (clone $query)->count();
        $activeAccounts = (clone $query)->where('status', 'active')->count();
        $totalFloatAllocated = (float) (clone $query)->where('status', 'active')->sum('float_limit');
        $totalCurrentCashHeld = (float) (clone $query)->where('status', 'active')->sum('current_balance');

        $accountIds = (clone $query)->pluck('id');
        $totalDisbursed = (float) abs(PettyCashTransaction::whereIn('petty_cash_account_id', $accountIds)
            ->where('transaction_type', 'expense_disbursement')
            ->sum('amount'));

        $totalReplenished = (float) PettyCashTransaction::whereIn('petty_cash_account_id', $accountIds)
            ->whereIn('transaction_type', ['initial_allocation', 'replenishment'])
            ->sum('amount');

        return response()->json([
            'data' => [
                'total_accounts' => $totalAccounts,
                'active_accounts' => $activeAccounts,
                'total_float_allocated' => $totalFloatAllocated,
                'total_current_cash_held' => $totalCurrentCashHeld,
                'total_disbursed' => $totalDisbursed,
                'total_replenished' => $totalReplenished,
                'utilization_rate' => $totalFloatAllocated > 0 ? round((($totalFloatAllocated - $totalCurrentCashHeld) / $totalFloatAllocated) * 100, 2) : 0,
            ],
        ]);
    }
}
