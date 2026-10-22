<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ExecutiveReportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExecutiveReportingController extends Controller
{
    protected ExecutiveReportingService $reportingService;

    public function __construct(ExecutiveReportingService $reportingService)
    {
        $this->reportingService = $reportingService;
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
}
