<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Site;
use App\Services\FinancialReportingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinancialReportController extends Controller
{
    protected FinancialReportingService $reportingService;

    public function __construct(FinancialReportingService $reportingService)
    {
        $this->reportingService = $reportingService;
    }

    /**
     * Resolve project and site numeric IDs from request.
     */
    protected function resolveFilters(Request $request): array
    {
        $projectId = null;
        if ($request->filled('project_id')) {
            $raw = $request->project_id;
            if (is_numeric($raw)) {
                $projectId = (int) $raw;
            } else {
                $p = Project::where('uuid', $raw)->first();
                if ($p) $projectId = $p->id;
            }
        }

        $siteId = null;
        if ($request->filled('site_id')) {
            $raw = $request->site_id;
            if (is_numeric($raw)) {
                $siteId = (int) $raw;
            } else {
                $s = Site::where('uuid', $raw)->first();
                if ($s) $siteId = $s->id;
            }
        }

        return [$projectId, $siteId];
    }

    /**
     * Executive Financial Summary KPIs
     */
    public function executiveSummary(Request $request): JsonResponse
    {
        [$projectId, $siteId] = $this->resolveFilters($request);
        $data = $this->reportingService->getExecutiveSummary($projectId, $siteId);

        return response()->json(['data' => $data]);
    }

    /**
     * Cost Accounting & Budget vs. Actual Variance Analysis
     */
    public function budgetVariance(Request $request): JsonResponse
    {
        [$projectId, $siteId] = $this->resolveFilters($request);
        $data = $this->reportingService->getBudgetVarianceReport($projectId, $siteId);

        return response()->json(['data' => $data]);
    }

    /**
     * Project Profitability & Gross Margins
     */
    public function profitability(Request $request): JsonResponse
    {
        [$projectId] = $this->resolveFilters($request);
        $data = $this->reportingService->getProfitabilityReport($projectId);

        return response()->json(['data' => $data]);
    }

    /**
     * 90-Day Cash Flow Forecast & Outflow Commitments Runway
     */
    public function cashFlowForecast(Request $request): JsonResponse
    {
        [$projectId] = $this->resolveFilters($request);
        $days = (int) $request->input('days', 90);
        $data = $this->reportingService->getCashFlowForecast($projectId, $days);

        return response()->json(['data' => $data]);
    }

    /**
     * Statutory Compliance, Tax & Governance Audit
     */
    public function complianceAudit(Request $request): JsonResponse
    {
        [$projectId] = $this->resolveFilters($request);
        $data = $this->reportingService->getComplianceAuditReport($projectId);

        return response()->json(['data' => $data]);
    }

    /**
     * Export Financial Report to CSV format
     */
    public function exportCsv(Request $request)
    {
        $reportType = $request->input('report_type', 'budget_variance');
        [$projectId] = $this->resolveFilters($request);

        $csv = $this->reportingService->exportCsv($reportType, $projectId);
        $filename = "financial_report_{$reportType}_" . now()->format('Ymd_His') . ".csv";

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
