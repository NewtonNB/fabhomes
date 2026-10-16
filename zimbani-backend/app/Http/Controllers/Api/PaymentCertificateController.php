<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApprovePaymentCertificateRequest;
use App\Http\Requests\PayPaymentCertificateRequest;
use App\Http\Requests\StorePaymentCertificateRequest;
use App\Http\Requests\UpdatePaymentCertificateRequest;
use App\Http\Requests\VerifyPaymentCertificateRequest;
use App\Http\Resources\PaymentCertificateResource;
use App\Models\PaymentCertificate;
use App\Models\Project;
use App\Models\Site;
use App\Models\SubcontractorContract;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PaymentCertificateController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a paginated listing of payment certificates.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', PaymentCertificate::class);

        $query = PaymentCertificate::with([
            'contract',
            'project',
            'site',
            'siteManager',
            'financeOfficer',
            'admin',
            'paidBy',
            'createdBy',
        ]);

        // Filter by contract
        if ($request->filled('contract_id')) {
            $contractId = $request->contract_id;
            if (is_numeric($contractId)) {
                $query->where('contract_id', $contractId);
            } else {
                $contract = SubcontractorContract::where('uuid', $contractId)->first();
                if ($contract) {
                    $query->where('contract_id', $contract->id);
                }
            }
        }

        // Filter by project
        if ($request->filled('project_id')) {
            $projectId = $request->project_id;
            if (is_numeric($projectId)) {
                $query->where('project_id', $projectId);
            } else {
                $project = Project::where('uuid', $projectId)->first();
                if ($project) {
                    $query->where('project_id', $project->id);
                }
            }
        }

        // Filter by site
        if ($request->filled('site_id')) {
            $siteId = $request->site_id;
            if (is_numeric($siteId)) {
                $query->where('site_id', $siteId);
            } else {
                $site = Site::where('uuid', $siteId)->first();
                if ($site) {
                    $query->where('site_id', $site->id);
                }
            }
        }

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by certificate type
        if ($request->filled('certificate_type')) {
            $query->where('certificate_type', $request->certificate_type);
        }

        // Search query
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('certificate_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('payment_reference', 'like', "%{$search}%")
                  ->orWhereHas('contract', function ($cq) use ($search) {
                      $cq->where('contract_number', 'like', "%{$search}%")
                         ->orWhere('subcontractor_name', 'like', "%{$search}%")
                         ->orWhere('title', 'like', "%{$search}%");
                  });
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = strtolower($request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        if (in_array($sortBy, ['created_at', 'certificate_number', 'gross_amount', 'net_certified_amount', 'valuation_date', 'status'])) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 15)));
        $certificates = $query->paginate($perPage);

        return PaymentCertificateResource::collection($certificates);
    }

    /**
     * Store a newly created payment certificate.
     */
    public function store(StorePaymentCertificateRequest $request): JsonResponse
    {
        $this->authorize('create', PaymentCertificate::class);

        $contract = $request->getContract();
        if (!$contract) {
            return response()->json([
                'message' => 'Specified subcontractor contract not found.',
            ], 422);
        }

        if (in_array($contract->status, ['terminated', 'completed'])) {
            return response()->json([
                'message' => "Cannot create certificates for a contract with status '{$contract->status}'.",
            ], 422);
        }

        $projectId = $request->getProjectId() ?? $contract->project_id;
        $siteId = $request->getSiteId() ?? $contract->site_id;

        // Auto-detect previous gross amount if not explicitly provided
        $previousGross = $request->input('previous_gross_amount');
        if ($previousGross === null) {
            $lastCert = PaymentCertificate::where('contract_id', $contract->id)
                ->whereIn('status', ['paid', 'authorized_by_admin', 'approved_by_finance', 'verified_by_site_manager'])
                ->latest('valuation_date')
                ->first();
            $previousGross = $lastCert ? (float) $lastCert->gross_amount : 0.00;
        }

        $retentionRate = $request->filled('retention_rate') 
            ? (float) $request->retention_rate 
            : (float) ($contract->retention_percentage ?? 5.00);

        $whtRate = $request->filled('withholding_tax_rate')
            ? (float) $request->withholding_tax_rate
            : 6.00; // URA standard 6% WHT

        $certificate = PaymentCertificate::create([
            'contract_id' => $contract->id,
            'project_id' => $projectId,
            'site_id' => $siteId,
            'valuation_period_start' => $request->valuation_period_start,
            'valuation_period_end' => $request->valuation_period_end,
            'valuation_date' => $request->valuation_date,
            'certificate_type' => $request->certificate_type,
            'gross_amount' => $request->gross_amount,
            'previous_gross_amount' => $previousGross,
            'materials_on_site_value' => $request->materials_on_site_value ?? 0.00,
            'retention_rate' => $retentionRate,
            'withholding_tax_rate' => $whtRate,
            'other_deductions' => $request->other_deductions ?? 0.00,
            'currency' => $request->currency ?? $contract->currency ?? 'UGX',
            'description' => $request->description,
            'measurement_sheet_summary' => $request->measurement_sheet_summary,
            'status' => 'draft',
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => 'Payment certificate created successfully',
            'data' => new PaymentCertificateResource($certificate->load(['contract', 'project', 'site', 'createdBy'])),
        ], 201);
    }

    /**
     * Display the specified payment certificate.
     */
    public function show(PaymentCertificate $paymentCertificate): JsonResponse
    {
        $this->authorize('view', $paymentCertificate);

        $paymentCertificate->load([
            'contract',
            'project',
            'site',
            'siteManager',
            'financeOfficer',
            'admin',
            'paidBy',
            'createdBy',
            'updatedBy',
            'documents',
        ]);

        return response()->json([
            'data' => new PaymentCertificateResource($paymentCertificate),
        ]);
    }

    /**
     * Update the specified payment certificate.
     */
    public function update(UpdatePaymentCertificateRequest $request, PaymentCertificate $paymentCertificate): JsonResponse
    {
        $this->authorize('update', $paymentCertificate);

        if (!in_array($paymentCertificate->status, ['draft', 'rejected'])) {
            return response()->json([
                'message' => "Only draft or rejected payment certificates can be modified.",
            ], 422);
        }

        $data = $request->only([
            'valuation_period_start',
            'valuation_period_end',
            'valuation_date',
            'certificate_type',
            'gross_amount',
            'previous_gross_amount',
            'materials_on_site_value',
            'retention_rate',
            'withholding_tax_rate',
            'other_deductions',
            'currency',
            'description',
            'measurement_sheet_summary',
        ]);

        $data['updated_by'] = auth()->id();

        // If it was rejected, resetting update allows re-submission
        if ($paymentCertificate->status === 'rejected') {
            $data['status'] = 'draft';
        }

        $paymentCertificate->update($data);

        return response()->json([
            'message' => 'Payment certificate updated successfully',
            'data' => new PaymentCertificateResource($paymentCertificate->fresh(['contract', 'project', 'site', 'updatedBy'])),
        ]);
    }

    /**
     * Remove the specified payment certificate.
     */
    public function destroy(PaymentCertificate $paymentCertificate): JsonResponse
    {
        $this->authorize('delete', $paymentCertificate);

        if ($paymentCertificate->status === 'paid') {
            return response()->json([
                'message' => 'Cannot delete a payment certificate that has already been paid.',
            ], 422);
        }

        $paymentCertificate->delete();

        return response()->json([
            'message' => 'Payment certificate deleted successfully',
        ]);
    }

    /**
     * Submit certificate for multi-tier verification.
     */
    public function submit(Request $request, PaymentCertificate $paymentCertificate): JsonResponse
    {
        $this->authorize('update', $paymentCertificate);

        if (!in_array($paymentCertificate->status, ['draft', 'rejected'])) {
            return response()->json([
                'message' => "Only draft or rejected certificates can be submitted.",
            ], 422);
        }

        $paymentCertificate->submit();

        return response()->json([
            'message' => 'Payment certificate submitted for site verification',
            'data' => new PaymentCertificateResource($paymentCertificate->fresh(['contract', 'project', 'site'])),
        ]);
    }

    /**
     * Site Manager verification sign-off.
     */
    public function verifySite(VerifyPaymentCertificateRequest $request, PaymentCertificate $paymentCertificate): JsonResponse
    {
        $this->authorize('verifySite', $paymentCertificate);

        if ($paymentCertificate->status !== 'submitted') {
            return response()->json([
                'message' => "Certificate must be in 'submitted' status to be verified by Site Manager.",
            ], 422);
        }

        $paymentCertificate->verifySiteManager(auth()->id(), $request->notes);

        return response()->json([
            'message' => 'Payment certificate verified by Site Manager',
            'data' => new PaymentCertificateResource($paymentCertificate->fresh(['contract', 'project', 'site', 'siteManager'])),
        ]);
    }

    /**
     * Finance Officer approval sign-off.
     */
    public function approveFinance(ApprovePaymentCertificateRequest $request, PaymentCertificate $paymentCertificate): JsonResponse
    {
        $this->authorize('approveFinance', $paymentCertificate);

        if ($paymentCertificate->status !== 'verified_by_site_manager') {
            return response()->json([
                'message' => "Certificate must be verified by Site Manager before Finance approval.",
            ], 422);
        }

        $paymentCertificate->approveFinance(auth()->id(), $request->notes);

        return response()->json([
            'message' => 'Payment certificate approved by Finance Officer',
            'data' => new PaymentCertificateResource($paymentCertificate->fresh(['contract', 'project', 'site', 'financeOfficer'])),
        ]);
    }

    /**
     * Company Admin payment authorization sign-off.
     */
    public function authorizeAdmin(Request $request, PaymentCertificate $paymentCertificate): JsonResponse
    {
        $this->authorize('authorizeAdmin', $paymentCertificate);

        if ($paymentCertificate->status !== 'approved_by_finance') {
            return response()->json([
                'message' => "Certificate must be approved by Finance before Admin authorization.",
            ], 422);
        }

        $request->validate(['notes' => 'nullable|string|max:1000']);
        $paymentCertificate->authorizeAdmin(auth()->id(), $request->notes);

        return response()->json([
            'message' => 'Payment certificate authorized by Administrator',
            'data' => new PaymentCertificateResource($paymentCertificate->fresh(['contract', 'project', 'site', 'admin'])),
        ]);
    }

    /**
     * Mark certificate as paid (Cashier / Finance disbursement).
     */
    public function pay(PayPaymentCertificateRequest $request, PaymentCertificate $paymentCertificate): JsonResponse
    {
        $this->authorize('pay', $paymentCertificate);

        if ($paymentCertificate->status !== 'authorized_by_admin') {
            return response()->json([
                'message' => "Certificate must be authorized by Administrator before payment disbursement.",
            ], 422);
        }

        $paymentCertificate->markPaid(auth()->id(), $request->payment_reference);

        return response()->json([
            'message' => 'Payment certificate marked as paid successfully',
            'data' => new PaymentCertificateResource($paymentCertificate->fresh(['contract', 'project', 'site', 'paidBy'])),
        ]);
    }

    /**
     * Reject payment certificate at any stage before payment.
     */
    public function reject(Request $request, PaymentCertificate $paymentCertificate): JsonResponse
    {
        $this->authorize('update', $paymentCertificate);

        if (in_array($paymentCertificate->status, ['paid', 'rejected'])) {
            return response()->json([
                'message' => "Certificate is already {$paymentCertificate->status}.",
            ], 422);
        }

        $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $paymentCertificate->reject(auth()->id(), $request->rejection_reason);

        return response()->json([
            'message' => 'Payment certificate rejected',
            'data' => new PaymentCertificateResource($paymentCertificate->fresh(['contract', 'project', 'site'])),
        ]);
    }

    /**
     * Statistics for payment certificates.
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', PaymentCertificate::class);

        $query = PaymentCertificate::query();

        if ($request->filled('contract_id')) {
            $contractId = $request->contract_id;
            if (is_numeric($contractId)) {
                $query->where('contract_id', $contractId);
            } else {
                $contract = SubcontractorContract::where('uuid', $contractId)->first();
                if ($contract) {
                    $query->where('contract_id', $contract->id);
                }
            }
        }

        if ($request->filled('project_id')) {
            $projectId = $request->project_id;
            if (is_numeric($projectId)) {
                $query->where('project_id', $projectId);
            } else {
                $project = Project::where('uuid', $projectId)->first();
                if ($project) {
                    $query->where('project_id', $project->id);
                }
            }
        }

        if ($request->filled('site_id')) {
            $siteId = $request->site_id;
            if (is_numeric($siteId)) {
                $query->where('site_id', $siteId);
            } else {
                $site = Site::where('uuid', $siteId)->first();
                if ($site) {
                    $query->where('site_id', $site->id);
                }
            }
        }

        $totalCount = (clone $query)->count();
        $draftCount = (clone $query)->where('status', 'draft')->count();
        $submittedCount = (clone $query)->where('status', 'submitted')->count();
        $verifiedCount = (clone $query)->where('status', 'verified_by_site_manager')->count();
        $approvedCount = (clone $query)->where('status', 'approved_by_finance')->count();
        $authorizedCount = (clone $query)->where('status', 'authorized_by_admin')->count();
        $paidCount = (clone $query)->where('status', 'paid')->count();
        $rejectedCount = (clone $query)->where('status', 'rejected')->count();

        $totalGrossCertified = (float) (clone $query)->whereIn('status', ['verified_by_site_manager', 'approved_by_finance', 'authorized_by_admin', 'paid'])->sum('current_gross_amount');
        $totalRetentionDeducted = (float) (clone $query)->whereIn('status', ['verified_by_site_manager', 'approved_by_finance', 'authorized_by_admin', 'paid'])->sum('retention_deducted');
        $totalWhtDeducted = (float) (clone $query)->whereIn('status', ['verified_by_site_manager', 'approved_by_finance', 'authorized_by_admin', 'paid'])->sum('withholding_tax_amount');
        $totalNetCertified = (float) (clone $query)->whereIn('status', ['verified_by_site_manager', 'approved_by_finance', 'authorized_by_admin', 'paid'])->sum('net_certified_amount');
        $totalPaidAmount = (float) (clone $query)->where('status', 'paid')->sum('net_certified_amount');

        return response()->json([
            'data' => [
                'total_certificates' => $totalCount,
                'draft_count' => $draftCount,
                'submitted_count' => $submittedCount,
                'verified_count' => $verifiedCount,
                'approved_count' => $approvedCount,
                'authorized_count' => $authorizedCount,
                'paid_count' => $paidCount,
                'rejected_count' => $rejectedCount,
                'total_gross_certified' => $totalGrossCertified,
                'total_retention_deducted' => $totalRetentionDeducted,
                'total_wht_deducted' => $totalWhtDeducted,
                'total_net_certified' => $totalNetCertified,
                'total_paid_amount' => $totalPaidAmount,
                'pending_payout' => max(0.0, $totalNetCertified - $totalPaidAmount),
            ],
        ]);
    }
}
