<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Notifications\NotificationDripService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class NotificationDripController extends Controller
{
    protected NotificationDripService $dripService;

    public function __construct(NotificationDripService $dripService)
    {
        $this->dripService = $dripService;
    }

    /**
     * Get aggregate drip automation summary metrics
     */
    public function summary(): JsonResponse
    {
        $summary = $this->dripService->getDripSummary();

        return response()->json([
            'status' => 'success',
            'data' => $summary,
        ]);
    }

    /**
     * Get paginated audit trail of drip execution triggers
     */
    public function logs(Request $request): JsonResponse
    {
        $perPage = (int) $request->input('per_page', 15);
        $logs = $this->dripService->getDripLogs($request->all(), $perPage);

        return response()->json([
            'status' => 'success',
            'data' => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    /**
     * Trigger manual execution of drip evaluation rules
     */
    public function runNow(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'dry_run' => 'nullable|boolean',
            'workflow' => 'nullable|string|in:all,savings,reservations,milestones,dormant',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $dryRun = $request->boolean('dry_run', false);
        $workflow = $request->input('workflow', 'all');

        $result = $this->dripService->runAllDrips($dryRun, $workflow);

        return response()->json([
            'status' => 'success',
            'message' => $dryRun ? 'Drip evaluation simulated (dry run).' : 'Drip campaign evaluated and triggered.',
            'data' => $result,
        ]);
    }
}
