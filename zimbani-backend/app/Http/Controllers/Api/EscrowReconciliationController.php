<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EscrowReconciliation;
use App\Models\EscrowReconciliationItem;
use App\Models\SavingsAccount;
use App\Models\Project;
use App\Services\EscrowReconciliationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Exception;

class EscrowReconciliationController extends Controller
{
    protected EscrowReconciliationService $service;

    public function __construct(EscrowReconciliationService $service)
    {
        $this->service = $service;
    }

    /**
     * List escrow reconciliations with filters and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = EscrowReconciliation::with([
            'savingsAccount.client:id,first_name,last_name',
            'project:id,name',
            'reconciledBy:id,name',
            'approvedBy:id,name',
        ]);

        if ($request->filled('savings_account_id')) {
            $query->where('savings_account_id', $request->savings_account_id);
        }

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('statement_date_from')) {
            $query->whereDate('statement_date', '>=', $request->statement_date_from);
        }

        if ($request->filled('statement_date_to')) {
            $query->whereDate('statement_date', '<=', $request->statement_date_to);
        }

        $perPage = min($request->input('per_page', 20), 100);
        $reconciliations = $query->latest('statement_date')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $reconciliations->items(),
            'current_page' => $reconciliations->currentPage(),
            'last_page' => $reconciliations->lastPage(),
            'total' => $reconciliations->total(),
            'per_page' => $reconciliations->perPage(),
        ]);
    }

    /**
     * Get details of a single escrow reconciliation with items.
     */
    public function show(string $uuid): JsonResponse
    {
        $reconciliation = EscrowReconciliation::where('uuid', $uuid)
            ->orWhere('id', $uuid)
            ->with([
                'savingsAccount.client',
                'project',
                'items.transaction',
                'items.paymentRelease',
                'items.resolvedBy:id,name',
                'reconciledBy:id,name',
                'approvedBy:id,name',
            ])
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $reconciliation,
        ]);
    }

    /**
     * Create and run an escrow account reconciliation.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'savings_account_id' => 'required',
            'statement_balance' => 'required|numeric',
            'statement_date' => 'nullable|date',
            'institution_name' => 'nullable|string|max:150',
            'statement_reference' => 'nullable|string|max:100',
            'currency' => 'nullable|string|size:3',
            'notes' => 'nullable|string',
            'external_items' => 'nullable|array',
            'external_items.*.amount' => 'required_with:external_items|numeric',
            'external_items.*.reference' => 'nullable|string',
            'external_items.*.type' => 'nullable|string',
            'external_items.*.date' => 'nullable|date',
        ]);

        $account = SavingsAccount::where('uuid', $request->savings_account_id)
            ->orWhere('id', $request->savings_account_id)
            ->firstOrFail();

        try {
            $reconciliation = $this->service->createReconciliation(
                $account,
                $request->all(),
                $request->user()
            );

            return response()->json([
                'success' => true,
                'message' => "Escrow Reconciliation {$reconciliation->reconciliation_number} completed. Status: {$reconciliation->status}.",
                'data' => $reconciliation,
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Resolve a specific reconciliation variance item.
     */
    public function resolveItem(Request $request, string $itemUuid): JsonResponse
    {
        $request->validate([
            'notes' => 'nullable|string',
        ]);

        $item = EscrowReconciliationItem::where('uuid', $itemUuid)
            ->orWhere('id', $itemUuid)
            ->firstOrFail();

        try {
            $resolved = $this->service->resolveVarianceItem($item, $request->all(), $request->user());

            return response()->json([
                'success' => true,
                'message' => 'Variance item resolved successfully.',
                'data' => $resolved,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Approve and finalize an Escrow Reconciliation.
     */
    public function approve(Request $request, string $uuid): JsonResponse
    {
        $request->validate([
            'notes' => 'nullable|string',
        ]);

        $reconciliation = EscrowReconciliation::where('uuid', $uuid)
            ->orWhere('id', $uuid)
            ->firstOrFail();

        try {
            $approved = $this->service->approveReconciliation(
                $reconciliation,
                $request->user(),
                $request->input('notes')
            );

            return response()->json([
                'success' => true,
                'message' => "Escrow Reconciliation {$approved->reconciliation_number} approved and finalized.",
                'data' => $approved,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'errors' => $e->errors(),
            ], 422);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get account-level reconciliation history and summary.
     */
    public function accountSummary(string $accountUuid): JsonResponse
    {
        $account = SavingsAccount::where('uuid', $accountUuid)
            ->orWhere('id', $accountUuid)
            ->firstOrFail();

        $summary = $this->service->getAccountReconciliations($account);

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    /**
     * Get project-level escrow reconciliation summary across all client accounts.
     */
    public function projectSummary(string $projectUuid): JsonResponse
    {
        $project = Project::where('uuid', $projectUuid)
            ->orWhere('id', $projectUuid)
            ->firstOrFail();

        $summary = $this->service->getProjectEscrowReconciliationSummary($project);

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }
}
