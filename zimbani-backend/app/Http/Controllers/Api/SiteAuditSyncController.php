<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SiteAuditSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiteAuditSyncController extends Controller
{
    protected SiteAuditSyncService $syncService;

    public function __construct(SiteAuditSyncService $syncService)
    {
        $this->syncService = $syncService;
    }

    /**
     * Fetch complete offline package for local client IndexedDB caching
     */
    public function getOfflinePackage(Request $request): JsonResponse
    {
        $projectId = $request->query('project_id') ? (int) $request->query('project_id') : null;
        $siteId = $request->query('site_id') ? (int) $request->query('site_id') : null;

        $package = $this->syncService->getOfflineCachePackage(
            $projectId,
            $siteId,
            $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => 'Offline cache package generated successfully.',
            'data' => $package,
        ]);
    }

    /**
     * Upload and synchronize batch of offline site walkthrough audits & defects
     */
    public function sync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'device_id' => 'nullable|string|max:64',
            'client_version' => 'nullable|string|max:20',
            'sync_type' => 'nullable|string|max:50',
            'inspections' => 'nullable|array',
            'inspections.*.client_sync_id' => 'nullable|string|max:64',
            'inspections.*.uuid' => 'nullable|string|max:36',
            'inspections.*.site_id' => 'required|integer|exists:sites,id',
            'inspections.*.project_id' => 'nullable|integer|exists:projects,id',
            'inspections.*.unit_id' => 'nullable|integer|exists:units,id',
            'inspections.*.milestone_id' => 'nullable|integer|exists:construction_milestones,id',
            'inspections.*.milestone_savings_pool_id' => 'nullable|integer|exists:milestone_savings_pools,id',
            'inspections.*.title' => 'nullable|string|max:255',
            'inspections.*.inspection_type' => 'nullable|string',
            'inspections.*.status' => 'nullable|string|in:scheduled,in_progress,passed,failed,passed_with_conditions,cancelled',
            'inspections.*.score' => 'nullable|numeric|min:0|max:100',
            'inspections.*.verified_milestone_percentage' => 'nullable|numeric|min:0|max:100',
            'inspections.*.checklist_items' => 'nullable|array',
            'inspections.*.summary_notes' => 'nullable|string',
            'inspections.*.conditions' => 'nullable|string',
            'inspections.*.gps_latitude' => 'nullable|numeric',
            'inspections.*.gps_longitude' => 'nullable|numeric',
            'inspections.*.gps_accuracy' => 'nullable|numeric',
            'inspections.*.weather_condition' => 'nullable|string',
            'inspections.*.work_authorized' => 'nullable|boolean',
            'inspections.*.offline_created_at' => 'nullable|string',
            'punch_list_items' => 'nullable|array',
            'punch_list_items.*.client_sync_id' => 'nullable|string|max:64',
            'punch_list_items.*.site_id' => 'required|integer|exists:sites,id',
            'punch_list_items.*.project_id' => 'nullable|integer|exists:projects,id',
            'punch_list_items.*.title' => 'required|string|max:255',
            'punch_list_items.*.description' => 'nullable|string',
            'punch_list_items.*.category' => 'nullable|string',
            'punch_list_items.*.severity' => 'nullable|string|in:low,medium,high,critical',
            'punch_list_items.*.location_details' => 'nullable|string',
            'punch_list_items.*.photo_url' => 'nullable|string',
            'punch_list_items.*.gps_latitude' => 'nullable|numeric',
            'punch_list_items.*.gps_longitude' => 'nullable|numeric',
            'punch_list_items.*.offline_created_at' => 'nullable|string',
        ]);

        $result = $this->syncService->syncOfflineAudits(
            $validated,
            $request->user(),
            $validated['device_id'] ?? null,
            $request->ip()
        );

        return response()->json([
            'success' => true,
            'message' => "Successfully synchronized {$result['total_processed']} items with {$result['total_conflicts']} conflicts.",
            'data' => $result,
        ]);
    }

    /**
     * List recent sync telemetry logs
     */
    public function syncLogs(Request $request): JsonResponse
    {
        $limit = min(100, max(5, (int) $request->query('limit', 25)));
        $logs = $this->syncService->getSyncLogs($limit);

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * Fetch standard checklist QA templates
     */
    public function checklistTemplates(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => SiteAuditSyncService::CHECKLIST_TEMPLATES,
        ]);
    }
}
