<?php

namespace App\Services;

use App\Models\Client;
use App\Models\ConstructionMilestone;
use App\Models\Project;
use App\Models\ScheduledReport;
use App\Models\Site;
use App\Models\Unit;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportExportService
{
    protected ExecutiveReportingService $reportingService;

    public function __construct(ExecutiveReportingService $reportingService)
    {
        $this->reportingService = $reportingService;
    }

    /**
     * Stream CSV export for specified report type.
     */
    public function exportCsv(string $reportType, array $filters = []): StreamedResponse
    {
        $filename = "zimbani_{$reportType}_" . Carbon::now()->format('Ymd_His') . ".csv";

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($reportType, $filters) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Excel compatibility
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            switch ($reportType) {
                case 'financial_summary':
                    $data = $this->reportingService->getFinancialSummary($filters);
                    fputcsv($handle, ['Period', 'Gross Revenue (UGX)', 'Transactions Count']);
                    foreach ($data['time_series_breakdown'] as $row) {
                        fputcsv($handle, [$row['date'], $row['revenue'], $row['transactions']]);
                    }
                    break;

                case 'client_activity':
                    $data = $this->reportingService->getClientActivityReport($filters);
                    fputcsv($handle, [
                        'Client ID',
                        'Client Number',
                        'Client Name',
                        'Email',
                        'Phone',
                        'Total Deposits (UGX)',
                        'Transaction Count',
                        'Active Schemes',
                        'Allocated Plots',
                        'Last Deposit Date',
                    ]);
                    foreach ($data['top_clients'] as $c) {
                        fputcsv($handle, [
                            $c['client_id'],
                            $c['client_number'],
                            $c['name'],
                            $c['email'] ?? 'N/A',
                            $c['phone'] ?? 'N/A',
                            $c['total_deposits'],
                            $c['transaction_count'],
                            $c['active_schemes'],
                            $c['allocated_plots'],
                            $c['last_deposit_at'] ?? 'None',
                        ]);
                    }
                    break;

                case 'plot_allocation':
                    $units = Unit::with(['site', 'client'])->get();
                    fputcsv($handle, [
                        'Estate / Site',
                        'Plot / Unit Number',
                        'Unit Type',
                        'Current Price (UGX)',
                        'Amount Paid (UGX)',
                        'Balance Outstanding (UGX)',
                        'Status',
                        'Client Owner',
                    ]);
                    foreach ($units as $u) {
                        fputcsv($handle, [
                            $u->site?->name ?? 'Unassigned Estate',
                            $u->unit_number,
                            strtoupper($u->unit_type),
                            $u->current_price ?? 0,
                            $u->amount_paid ?? 0,
                            $u->balance ?? 0,
                            strtoupper($u->status),
                            $u->client?->name ?? 'Available',
                        ]);
                    }
                    break;

                case 'construction_progress':
                    $data = $this->reportingService->getConstructionProgressReport($filters);
                    fputcsv($handle, [
                        'Project Name',
                        'Site / Estate',
                        'Status',
                        'Completion %',
                        'Budget (UGX)',
                        'Actual Cost (UGX)',
                        'Variance (UGX)',
                        'Health Status',
                        'Milestones Total',
                        'Milestones Completed',
                        'Milestones Delayed',
                        'Target Completion Date',
                    ]);
                    foreach ($data['by_project'] as $p) {
                        fputcsv($handle, [
                            $p['project_name'],
                            $p['site_name'],
                            strtoupper($p['status']),
                            $p['completion_percentage'] . '%',
                            $p['budget'],
                            $p['actual_cost'],
                            $p['variance'],
                            strtoupper($p['health_status']),
                            $p['milestones_total'],
                            $p['milestones_completed'],
                            $p['milestones_delayed'],
                            $p['target_completion_date'] ?? 'N/A',
                        ]);
                    }
                    break;

                case 'cash_flow':
                default:
                    $data = $this->reportingService->getCashFlowBreakdown($filters);
                    fputcsv($handle, ['Flow Direction', 'Category / Stream', 'Amount (UGX)']);
                    foreach ($data['inflows']['breakdown'] as $cat => $amt) {
                        fputcsv($handle, ['INFLOW', ucwords(str_replace('_', ' ', $cat)), $amt]);
                    }
                    foreach ($data['outflows']['breakdown'] as $cat => $amt) {
                        fputcsv($handle, ['OUTFLOW', ucwords(str_replace('_', ' ', $cat)), $amt]);
                    }
                    fputcsv($handle, ['NET OPERATING CASH FLOW', 'Total Net Flow', $data['net_operating_cash_flow']]);
                    break;
            }

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Generate structured print-ready view data.
     */
    public function getPrintView(string $reportType, array $filters = []): array
    {
        $organization = [
            'name' => 'FAB HOMES UGANDA',
            'system' => 'ZIMBANI Platform Enterprise BI',
            'generated_at' => Carbon::now()->toIso8601String(),
            'currency' => 'UGX',
        ];

        return match ($reportType) {
            'financial_summary' => [
                'organization' => $organization,
                'title' => 'Executive Financial Summary Report',
                'report' => $this->reportingService->getFinancialSummary($filters),
            ],
            'client_activity' => [
                'organization' => $organization,
                'title' => 'Client Activity & Scheme Engagement Leaderboard',
                'report' => $this->reportingService->getClientActivityReport($filters),
            ],
            'plot_allocation' => [
                'organization' => $organization,
                'title' => 'Plot Allocation & Estate Land Inventory Audit',
                'report' => $this->reportingService->getPlotAllocationReport($filters),
            ],
            'construction_progress' => [
                'organization' => $organization,
                'title' => 'Construction Milestone Adherence & Project Health',
                'report' => $this->reportingService->getConstructionProgressReport($filters),
            ],
            'cash_flow' => [
                'organization' => $organization,
                'title' => 'Operational Cash Flow & Liquidity Velocity Statement',
                'report' => $this->reportingService->getCashFlowBreakdown($filters),
            ],
            default => [
                'organization' => $organization,
                'title' => 'Enterprise Management KPI Dashboard',
                'report' => $this->reportingService->getExecutiveKpis(),
            ],
        };
    }

    /**
     * Configure recurring scheduled report delivery.
     */
    public function createSchedule(array $data, int $userId): ScheduledReport
    {
        return ScheduledReport::create([
            'name' => $data['name'],
            'report_type' => $data['report_type'],
            'frequency' => $data['frequency'] ?? 'weekly',
            'format' => $data['format'] ?? 'csv',
            'recipients' => $data['recipients'] ?? [],
            'filters' => $data['filters'] ?? null,
            'is_active' => true,
            'created_by' => $userId,
        ]);
    }

    /**
     * List all scheduled reports.
     */
    public function listSchedules(): Collection
    {
        return ScheduledReport::with('createdBy')->latest()->get();
    }

    /**
     * Toggle active status of a scheduled report.
     */
    public function toggleSchedule(ScheduledReport $schedule): ScheduledReport
    {
        $schedule->update(['is_active' => !$schedule->is_active]);
        return $schedule;
    }
}
