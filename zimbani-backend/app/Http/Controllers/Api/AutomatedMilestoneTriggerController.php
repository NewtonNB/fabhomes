<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MilestoneVerification;
use App\Models\MilestoneTriggerLog;
use App\Models\Project;
use App\Services\AutomatedMilestoneTriggerService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Exception;

class AutomatedMilestoneTriggerController extends Controller
{
    protected AutomatedMilestoneTriggerService $service;

    public function __construct(AutomatedMilestoneTriggerService $service)
    {
        $this->service = $service;
    }

    /**
     * Evaluate and trigger automated escrow payment release for a single milestone verification.
     */
    public function triggerForVerification(Request $request, string $verificationUuid): JsonResponse
    {
        $verification = MilestoneVerification::where('uuid', $verificationUuid)
            ->orWhere('id', $verificationUuid)
            ->firstOrFail();

        try {
            $log = $this->service->evaluateAndTriggerRelease($verification, $request->user());

            $message = match ($log->status) {
                'success_authorized' => 'Milestone payment release auto-authorized from client escrow.',
                'success_disbursed' => 'Milestone payment release auto-disbursed from client escrow.',
                'insufficient_escrow_funds' => "Shortfall detected. Client escrow requires {$log->shortfall_amount} to complete release.",
                'already_processed' => 'Milestone release has already been processed.',
                'no_escrow_account' => 'No active escrow savings account located for client.',
                default => 'Trigger evaluation concluded.',
            };

            return response()->json([
                'success' => in_array($log->status, ['success_authorized', 'success_disbursed', 'already_processed']),
                'message' => $message,
                'data' => $log->load(['verification', 'paymentRelease', 'savingsAccount']),
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk evaluate all pending client-approved milestone verifications.
     */
    public function bulkEvaluate(Request $request): JsonResponse
    {
        $projectId = $request->input('project_id');

        try {
            $result = $this->service->bulkEvaluatePendingTriggers($projectId ? intval($projectId) : null, $request->user());

            return response()->json([
                'success' => true,
                'message' => "Bulk evaluation completed: {$result['authorized_count']} releases authorized, {$result['shortfall_count']} shortfalls noted.",
                'data' => $result,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get active escrow shortfall alerts.
     */
    public function shortfallAlerts(Request $request): JsonResponse
    {
        $projectId = $request->input('project_id');

        $alerts = $this->service->getShortfallAlerts($projectId ? intval($projectId) : null);

        return response()->json([
            'success' => true,
            'data' => $alerts,
        ]);
    }

    /**
     * List trigger audit logs with pagination and filters.
     */
    public function logs(Request $request): JsonResponse
    {
        $query = MilestoneTriggerLog::with([
            'verification.milestone',
            'verification.project',
            'paymentRelease',
            'savingsAccount.client',
            'triggeredBy:id,name',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('verification_id')) {
            $query->where('milestone_verification_id', $request->verification_id);
        }

        if ($request->filled('project_id')) {
            $query->whereHas('verification', function ($q) use ($request) {
                $q->where('project_id', $request->project_id);
            });
        }

        $perPage = min($request->input('per_page', 20), 100);
        $logs = $query->latest('created_at')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $logs->items(),
            'current_page' => $logs->currentPage(),
            'last_page' => $logs->lastPage(),
            'total' => $logs->total(),
            'per_page' => $logs->perPage(),
        ]);
    }
}
