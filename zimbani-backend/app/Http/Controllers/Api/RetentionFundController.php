<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\RetentionFund;
use App\Services\RetentionFundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RetentionFundController extends Controller
{
    public function __construct(
        protected RetentionFundService $retentionFundService
    ) {}

    /**
     * Display a listing of retention funds.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', RetentionFund::class);

        $query = RetentionFund::with(['project', 'unit', 'contract', 'client', 'clearedByUser']);

        if ($request->filled('project_id')) {
            $projectId = $request->project_id;
            if (!is_numeric($projectId)) {
                $p = Project::where('uuid', $projectId)->first();
                $projectId = $p?->id;
            }
            if ($projectId) {
                $query->where('project_id', $projectId);
            }
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('fund_type')) {
            $query->where('fund_type', $request->fund_type);
        }

        if ($request->boolean('matured_only')) {
            $query->whereNotNull('dlp_expiry_date')
                ->whereDate('dlp_expiry_date', '<=', now()->toDateString())
                ->where('current_balance', '>', 0);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('fund_number', 'like', "%{$s}%")
                  ->orWhere('beneficiary_name', 'like', "%{$s}%")
                  ->orWhereHas('contract', function ($cq) use ($s) {
                      $cq->where('contract_number', 'like', "%{$s}%");
                  });
            });
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 20)));
        $funds = $query->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $funds,
        ]);
    }

    /**
     * Portfolio statistics for retention funds and Defect Liability Periods.
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', RetentionFund::class);

        $projectId = null;
        if ($request->filled('project_id')) {
            $pId = $request->project_id;
            if (!is_numeric($pId)) {
                $p = Project::where('uuid', $pId)->first();
                $projectId = $p?->id;
            } else {
                $projectId = (int) $pId;
            }
        }

        $stats = $this->retentionFundService->getPortfolioStatistics($projectId);

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Display single retention fund with transaction history.
     */
    public function show(string $uuid): JsonResponse
    {
        $fund = RetentionFund::where('uuid', $uuid)
            ->with([
                'project',
                'unit',
                'contract',
                'client',
                'clearedByUser',
                'transactions.defectCertificate',
                'transactions.paymentCertificate',
                'transactions.milestonePaymentRelease',
                'transactions.processedByUser',
                'certificates.engineerUser',
                'certificates.qsUser',
            ])
            ->firstOrFail();

        $this->authorize('view', $fund);

        return response()->json([
            'success' => true,
            'data' => $fund,
        ]);
    }

    /**
     * Get DLP maturity schedule and snag clearance checklist.
     */
    public function maturitySchedule(string $uuid): JsonResponse
    {
        $fund = RetentionFund::where('uuid', $uuid)->firstOrFail();
        $this->authorize('view', $fund);

        $schedule = $this->retentionFundService->evaluateDlpAndSnagClearance($fund);

        return response()->json([
            'success' => true,
            'data' => $schedule,
        ]);
    }

    /**
     * Record a deduction from retention for defect rectification.
     */
    public function rectificationDeduction(Request $request, string $uuid): JsonResponse
    {
        $fund = RetentionFund::where('uuid', $uuid)->firstOrFail();
        $this->authorize('update', $fund);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'required|string|max:500',
        ]);

        $txn = $this->retentionFundService->recordRectificationDeduction(
            $fund,
            (float) $validated['amount'],
            $validated['reason'],
            $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => "Defect rectification deduction of {$txn->amount} recorded.",
            'data' => [
                'transaction' => $txn,
                'fund' => $fund->fresh(),
            ],
        ]);
    }

    /**
     * Authorize and disburse retention (interim 50% or final 100%).
     */
    public function release(Request $request, string $uuid): JsonResponse
    {
        $fund = RetentionFund::where('uuid', $uuid)->firstOrFail();
        $this->authorize('update', $fund);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'release_type' => 'required|in:interim_release,final_release',
            'notes' => 'nullable|string|max:500',
        ]);

        $txn = $this->retentionFundService->releaseRetention(
            $fund,
            (float) $validated['amount'],
            $validated['release_type'],
            null,
            $validated['notes'] ?? null,
            $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => "Retention {$validated['release_type']} of {$txn->amount} disbursed successfully.",
            'data' => [
                'transaction' => $txn,
                'fund' => $fund->fresh(),
            ],
        ]);
    }

    /**
     * Manually start or update Defect Liability Period on a fund.
     */
    public function startDlp(Request $request, string $uuid): JsonResponse
    {
        $fund = RetentionFund::where('uuid', $uuid)->firstOrFail();
        $this->authorize('update', $fund);

        $validated = $request->validate([
            'practical_completion_date' => 'required|date',
            'dlp_period_days' => 'nullable|integer|min:30|max:730',
        ]);

        $updated = $this->retentionFundService->startDefectLiabilityPeriod(
            $fund,
            $validated['practical_completion_date'],
            (int) ($validated['dlp_period_days'] ?? 180),
            $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => "Defect Liability Period commenced until {$updated->dlp_expiry_date}.",
            'data' => $updated,
        ]);
    }
}
