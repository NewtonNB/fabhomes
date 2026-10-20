<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConstructionSavingScheme;
use App\Models\MilestoneSavingsPool;
use App\Models\Project;
use App\Models\SavingsAccount;
use App\Services\ConstructionSavingSchemeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class ConstructionSavingSchemeController extends Controller
{
    protected ConstructionSavingSchemeService $schemeService;

    public function __construct(ConstructionSavingSchemeService $schemeService)
    {
        $this->schemeService = $schemeService;
    }

    /**
     * Display a listing of construction saving schemes.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ConstructionSavingScheme::with('createdByUser:id,name,email')
            ->withCount('savingsAccounts');

        if ($request->filled('project_type')) {
            $query->where('project_type', $request->project_type);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'LIKE', "%{$s}%")
                    ->orWhere('scheme_code', 'LIKE', "%{$s}%")
                    ->orWhere('description', 'LIKE', "%{$s}%");
            });
        }

        $schemes = $query->latest()->paginate($request->input('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $schemes,
        ]);
    }

    /**
     * Seed or ensure standard schemes exist.
     */
    public function seedDefaults(Request $request): JsonResponse
    {
        $schemes = $this->schemeService->seedDefaultSchemes($request->user());

        return response()->json([
            'success' => true,
            'message' => 'Standard construction saving schemes seeded successfully.',
            'data' => $schemes,
        ]);
    }

    /**
     * Store a new custom construction saving scheme.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'scheme_code' => 'nullable|string|max:50|unique:construction_saving_schemes,scheme_code',
            'description' => 'nullable|string',
            'project_type' => 'nullable|string|in:residential,commercial,mixed_use,infrastructure',
            'currency' => 'nullable|string|size:3',
            'standard_target_amount' => 'required|numeric|min:0',
            'minimum_initial_deposit' => 'nullable|numeric|min:0',
            'minimum_milestone_threshold_percentage' => 'nullable|numeric|min:0|max:100',
            'waterfall_auto_allocation' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'milestone_template' => 'nullable|array|min:1',
            'milestone_template.*.tier_order' => 'required|integer|min:1',
            'milestone_template.*.name' => 'required|string|max:255',
            'milestone_template.*.weight_percentage' => 'required|numeric|min:0|max:100',
            'milestone_template.*.description' => 'nullable|string',
        ]);

        try {
            $scheme = $this->schemeService->createScheme($validated, $request->user());

            return response()->json([
                'success' => true,
                'message' => 'Construction saving scheme template created successfully.',
                'data' => $scheme,
            ], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Display a specific construction saving scheme.
     */
    public function show(string $uuid): JsonResponse
    {
        $scheme = ConstructionSavingScheme::where('uuid', $uuid)
            ->with(['createdByUser:id,name,email', 'savingsAccounts'])
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $scheme,
        ]);
    }

    /**
     * Update a construction saving scheme.
     */
    public function update(Request $request, string $uuid): JsonResponse
    {
        $scheme = ConstructionSavingScheme::where('uuid', $uuid)->firstOrFail();

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'project_type' => 'nullable|string|in:residential,commercial,mixed_use,infrastructure',
            'standard_target_amount' => 'sometimes|required|numeric|min:0',
            'minimum_initial_deposit' => 'nullable|numeric|min:0',
            'minimum_milestone_threshold_percentage' => 'nullable|numeric|min:0|max:100',
            'waterfall_auto_allocation' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'milestone_template' => 'nullable|array|min:1',
            'milestone_template.*.tier_order' => 'required|integer|min:1',
            'milestone_template.*.name' => 'required|string|max:255',
            'milestone_template.*.weight_percentage' => 'required|numeric|min:0|max:100',
            'milestone_template.*.description' => 'nullable|string',
        ]);

        if (isset($validated['milestone_template'])) {
            $totalWeight = array_sum(array_column($validated['milestone_template'], 'weight_percentage'));
            if (abs($totalWeight - 100.00) > 0.5) {
                return response()->json([
                    'success' => false,
                    'message' => "Milestone weight percentages must sum to 100%. Current sum: {$totalWeight}%",
                ], 422);
            }
        }

        $validated['updated_by'] = $request->user()?->id ?? auth()->id();
        $scheme->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Construction saving scheme updated successfully.',
            'data' => $scheme->fresh(),
        ]);
    }

    /**
     * Delete a construction saving scheme.
     */
    public function destroy(string $uuid): JsonResponse
    {
        $scheme = ConstructionSavingScheme::where('uuid', $uuid)->firstOrFail();

        if ($scheme->savingsAccounts()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete scheme because active savings accounts are enrolled in it.',
            ], 422);
        }

        $scheme->delete();

        return response()->json([
            'success' => true,
            'message' => 'Construction saving scheme removed successfully.',
        ]);
    }

    /**
     * Enroll a savings account in a construction saving scheme.
     */
    public function enrollAccount(Request $request, SavingsAccount $savingsAccount): JsonResponse
    {
        $validated = $request->validate([
            'scheme_id' => 'required_without:scheme_uuid|nullable|integer|exists:construction_saving_schemes,id',
            'scheme_uuid' => 'required_without:scheme_id|nullable|string|exists:construction_saving_schemes,uuid',
            'project_id' => 'nullable|integer|exists:projects,id',
        ]);

        $scheme = isset($validated['scheme_id'])
            ? ConstructionSavingScheme::findOrFail($validated['scheme_id'])
            : ConstructionSavingScheme::where('uuid', $validated['scheme_uuid'])->firstOrFail();

        $project = isset($validated['project_id']) ? Project::find($validated['project_id']) : null;

        try {
            $updatedAccount = $this->schemeService->enrollAccountInScheme(
                $savingsAccount,
                $scheme,
                $project,
                $request->user()
            );

            return response()->json([
                'success' => true,
                'message' => "Account {$savingsAccount->account_number} enrolled in '{$scheme->name}' with tiered milestone pools.",
                'data' => $updatedAccount,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get all milestone savings pools for a savings account.
     */
    public function getAccountPools(SavingsAccount $savingsAccount): JsonResponse
    {
        $pools = $savingsAccount->milestonePools()
            ->with(['constructionMilestone', 'allocations' => fn($q) => $q->latest()->limit(10)])
            ->get();

        $audit = $this->schemeService->getAccountReadinessAudit($savingsAccount);

        return response()->json([
            'success' => true,
            'data' => [
                'account' => $savingsAccount,
                'audit' => $audit,
                'pools' => $pools,
            ],
        ]);
    }

    /**
     * Allocate deposit or available funds across milestone pools.
     */
    public function allocateDeposit(Request $request, SavingsAccount $savingsAccount): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_id' => 'nullable|integer|exists:payments,id',
            'mode' => 'nullable|string|in:waterfall,custom',
            'custom_allocations' => 'nullable|array',
            'custom_allocations.*' => 'numeric|min:0',
        ]);

        try {
            $result = $this->schemeService->allocateDeposit(
                $savingsAccount,
                (float) $validated['amount'],
                $validated['payment_id'] ?? null,
                $validated['mode'] ?? 'waterfall',
                $validated['custom_allocations'] ?? null,
                $request->user()
            );

            return response()->json([
                'success' => true,
                'message' => "Allocated {$validated['amount']} {$savingsAccount->currency} across milestone pools.",
                'data' => $result,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Rebalance funds between two milestone pools.
     */
    public function rebalancePools(Request $request, SavingsAccount $savingsAccount): JsonResponse
    {
        $validated = $request->validate([
            'from_pool_id' => 'required|integer|exists:milestone_savings_pools,id',
            'to_pool_id' => 'required|integer|exists:milestone_savings_pools,id',
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:255',
        ]);

        try {
            $result = $this->schemeService->rebalancePools(
                $savingsAccount,
                (int) $validated['from_pool_id'],
                (int) $validated['to_pool_id'],
                (float) $validated['amount'],
                $validated['reason'],
                $request->user()
            );

            return response()->json([
                'success' => true,
                'message' => "Rebalanced {$validated['amount']} {$savingsAccount->currency} between milestone pools.",
                'data' => $result,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Lock milestone pool funds in escrow for site work commencement.
     */
    public function lockPool(Request $request, string $poolUuid): JsonResponse
    {
        $pool = MilestoneSavingsPool::where('uuid', $poolUuid)
            ->with('savingsAccount.constructionScheme')
            ->firstOrFail();

        $validated = $request->validate([
            'amount' => 'nullable|numeric|min:0.01',
        ]);

        try {
            $lockedPool = $this->schemeService->lockMilestonePool(
                $pool,
                isset($validated['amount']) ? (float) $validated['amount'] : null,
                $request->user()
            );

            return response()->json([
                'success' => true,
                'message' => "Milestone pool '{$pool->milestone_name}' locked in escrow. Site work authorized to commence.",
                'data' => $lockedPool,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get construction milestone readiness and funding audit.
     */
    public function getAccountReadiness(SavingsAccount $savingsAccount): JsonResponse
    {
        $audit = $this->schemeService->getAccountReadinessAudit($savingsAccount);

        return response()->json([
            'success' => true,
            'data' => $audit,
        ]);
    }
}
