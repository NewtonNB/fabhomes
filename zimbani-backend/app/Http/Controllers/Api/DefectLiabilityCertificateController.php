<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DefectLiabilityCertificate;
use App\Models\Project;
use App\Services\DefectLiabilityCertificateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DefectLiabilityCertificateController extends Controller
{
    public function __construct(
        protected DefectLiabilityCertificateService $certificateService
    ) {}

    /**
     * Display a listing of defect liability and practical completion certificates.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', DefectLiabilityCertificate::class);

        $query = DefectLiabilityCertificate::with([
            'project',
            'unit',
            'contract',
            'client',
            'retentionFund',
            'engineerUser',
            'qsUser',
        ]);

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

        if ($request->filled('certificate_type')) {
            $query->where('certificate_type', $request->certificate_type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('certificate_number', 'like', "%{$s}%")
                  ->orWhereHas('contract', function ($cq) use ($s) {
                      $cq->where('subcontractor_name', 'like', "%{$s}%")
                         ->orWhere('contract_number', 'like', "%{$s}%");
                  });
            });
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 20)));
        $certs = $query->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $certs,
        ]);
    }

    /**
     * Issue practical completion, defect clearance, or final handover certificate.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', DefectLiabilityCertificate::class);

        $validated = $request->validate([
            'certificate_type' => 'required|in:practical_completion,defect_clearance,retention_release,final_handover',
            'project_id' => 'required|exists:projects,id',
            'contract_id' => 'nullable|exists:subcontractor_contracts,id',
            'unit_id' => 'nullable|exists:units,id',
            'client_id' => 'nullable|exists:clients,id',
            'retention_fund_id' => 'nullable|exists:retention_funds,id',
            'commencement_date' => 'nullable|date',
            'dlp_period_days' => 'nullable|integer|min:30|max:730',
            'release_initial_retention' => 'nullable|boolean',
            'initial_release_percentage' => 'nullable|numeric|min:1|max:100',
            'inspection_notes' => 'nullable|string',
            'certificate_notes' => 'nullable|string',
        ]);

        $type = $validated['certificate_type'];
        $cert = match ($type) {
            'practical_completion' => $this->certificateService->issuePracticalCompletionCertificate($validated, $request->user()),
            'defect_clearance' => $this->certificateService->issueDefectClearanceCertificate($validated, $request->user()),
            'retention_release' => $this->certificateService->issueFinalRetentionReleaseCertificate($validated, $request->user()),
            'final_handover' => $this->certificateService->issueFinalHandoverProtocol($validated, $request->user()),
        };

        return response()->json([
            'success' => true,
            'message' => "Certificate {$cert->certificate_number} issued successfully.",
            'data' => $cert,
        ], 201);
    }

    /**
     * Display single certificate.
     */
    public function show(string $uuid): JsonResponse
    {
        $cert = DefectLiabilityCertificate::where('uuid', $uuid)
            ->with([
                'project',
                'unit',
                'contract',
                'client',
                'retentionFund',
                'engineerUser',
                'qsUser',
                'punchListItems',
                'retentionTransactions',
            ])
            ->firstOrFail();

        $this->authorize('view', $cert);

        return response()->json([
            'success' => true,
            'data' => $cert,
        ]);
    }

    /**
     * Site Engineer sign-off on certificate.
     */
    public function signEngineer(Request $request, string $uuid): JsonResponse
    {
        $cert = DefectLiabilityCertificate::where('uuid', $uuid)->firstOrFail();
        $this->authorize('update', $cert);

        $validated = $request->validate([
            'inspection_notes' => 'nullable|string',
        ]);

        $updated = $this->certificateService->signCertificate(
            $cert,
            'engineer',
            $request->user(),
            $validated['inspection_notes'] ?? null
        );

        return response()->json([
            'success' => true,
            'message' => 'Site Engineer sign-off recorded.',
            'data' => $updated,
        ]);
    }

    /**
     * Quantity Surveyor sign-off on certificate.
     */
    public function signQs(Request $request, string $uuid): JsonResponse
    {
        $cert = DefectLiabilityCertificate::where('uuid', $uuid)->firstOrFail();
        $this->authorize('update', $cert);

        $validated = $request->validate([
            'certificate_notes' => 'nullable|string',
        ]);

        $updated = $this->certificateService->signCertificate(
            $cert,
            'qs',
            $request->user(),
            $validated['certificate_notes'] ?? null
        );

        return response()->json([
            'success' => true,
            'message' => 'Quantity Surveyor sign-off recorded.',
            'data' => $updated,
        ]);
    }

    /**
     * Client sign-off on certificate.
     */
    public function signClient(Request $request, string $uuid): JsonResponse
    {
        $cert = DefectLiabilityCertificate::where('uuid', $uuid)->firstOrFail();
        $this->authorize('update', $cert);

        $updated = $this->certificateService->signCertificate($cert, 'client', $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Client sign-off recorded.',
            'data' => $updated,
        ]);
    }

    /**
     * Perform punch list snag clearance audit for this certificate / project.
     */
    public function snagsCheck(Request $request, string $uuid): JsonResponse
    {
        $cert = DefectLiabilityCertificate::where('uuid', $uuid)->firstOrFail();
        $this->authorize('view', $cert);

        $audit = $this->certificateService->conductSnagAudit(
            $cert->project_id,
            $cert->unit_id,
            $cert->contract_id
        );

        return response()->json([
            'success' => true,
            'data' => $audit,
        ]);
    }
}
