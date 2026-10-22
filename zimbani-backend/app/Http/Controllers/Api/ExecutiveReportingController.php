<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ScheduledReport;
use App\Services\ExecutiveReportingService;
use App\Services\ReportExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExecutiveReportingController extends Controller
{
    protected ExecutiveReportingService $reportingService;
    protected ReportExportService $exportService;

    public function __construct(
        ExecutiveReportingService $reportingService,
        ReportExportService $exportService
    ) {
        $this->reportingService = $reportingService;
        $this->exportService = $exportService;
    }

    /**
     * Financial Summary Report
     * GET /api/v1/reports/financial-summary
     */
    public function financialSummary(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'group_by' => 'nullable|string|in:day,week,month',
            'account_type' => 'nullable|string',
            'gateway' => 'nullable|string',
        ]);

        $report = $this->reportingService->getFinancialSummary($filters);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Cash Flow Breakdown & Liquidity Velocity
     * GET /api/v1/reports/cash-flow-breakdown
     */
    public function cashFlowBreakdown(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $report = $this->reportingService->getCashFlowBreakdown($filters);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Top-Level Executive Management KPIs
     * GET /api/v1/reports/executive-kpis
     */
    public function executiveKpis(): JsonResponse
    {
        $kpis = $this->reportingService->getExecutiveKpis();

        return response()->json([
            'success' => true,
            'data' => $kpis,
        ]);
    }

    /**
     * Client Activity & Engagement Report
     * GET /api/v1/reports/client-activity
     */
    public function clientActivity(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'status' => 'nullable|string',
        ]);

        $report = $this->reportingService->getClientActivityReport($filters);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Plot Allocation & Estate Inventory Report
     * GET /api/v1/reports/plot-allocation
     */
    public function plotAllocation(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'site_id' => 'nullable|integer',
            'status' => 'nullable|string',
        ]);

        $report = $this->reportingService->getPlotAllocationReport($filters);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Construction Milestone & Project Health Analytics
     * GET /api/v1/reports/construction-progress
     */
    public function constructionProgress(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'project_id' => 'nullable|integer',
            'site_id' => 'nullable|integer',
            'status' => 'nullable|string',
        ]);

        $report = $this->reportingService->getConstructionProgressReport($filters);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Multi-Format CSV Stream Export
     * GET /api/v1/reports/export/csv
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $request->validate([
            'report_type' => 'required|string|in:financial_summary,client_activity,plot_allocation,construction_progress,cash_flow',
        ]);

        return $this->exportService->exportCsv(
            $request->input('report_type'),
            $request->except(['report_type'])
        );
    }

    /**
     * Print-Ready Structured View
     * GET /api/v1/reports/export/print-view
     */
    public function printView(Request $request): JsonResponse
    {
        $request->validate([
            'report_type' => 'required|string|in:financial_summary,client_activity,plot_allocation,construction_progress,cash_flow,executive_kpis',
        ]);

        $viewData = $this->exportService->getPrintView(
            $request->input('report_type'),
            $request->except(['report_type'])
        );

        return response()->json([
            'success' => true,
            'data' => $viewData,
        ]);
    }

    /**
     * List Recurring Scheduled Reports
     * GET /api/v1/reports/schedules
     */
    public function listSchedules(): JsonResponse
    {
        $schedules = $this->exportService->listSchedules();

        return response()->json([
            'success' => true,
            'data' => $schedules,
        ]);
    }

    /**
     * Configure New Scheduled Report Delivery
     * POST /api/v1/reports/schedules
     */
    public function createSchedule(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'report_type' => 'required|string|in:financial_summary,client_activity,plot_allocation,construction_progress,cash_flow',
            'frequency' => 'nullable|string|in:daily,weekly,monthly',
            'format' => 'nullable|string|in:csv,pdf,both',
            'recipients' => 'required|array|min:1',
            'recipients.*' => 'email',
            'filters' => 'nullable|array',
        ]);

        $schedule = $this->exportService->createSchedule($data, auth()->id() ?? 1);

        return response()->json([
            'success' => true,
            'message' => 'Scheduled report created successfully',
            'data' => $schedule,
        ], 201);
    }

    /**
     * Toggle Active Status of Scheduled Report
     * POST /api/v1/reports/schedules/{schedule}/toggle
     */
    public function toggleSchedule(string $identifier): JsonResponse
    {
        $schedule = is_numeric($identifier)
            ? ScheduledReport::findOrFail((int) $identifier)
            : ScheduledReport::where('uuid', $identifier)->firstOrFail();

        $updated = $this->exportService->toggleSchedule($schedule);

        return response()->json([
            'success' => true,
            'message' => 'Schedule status toggled',
            'data' => $updated,
        ]);
    }
}
