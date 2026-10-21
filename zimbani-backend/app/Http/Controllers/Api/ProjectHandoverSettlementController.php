<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProjectFinalSettlement;
use App\Models\ProjectHandover;
use App\Services\ProjectHandoverSettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectHandoverSettlementController extends Controller
{
    public function __construct(
        protected ProjectHandoverSettlementService $service
    ) {}

    /**
     * List project handovers.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['project_id', 'client_id', 'status']);
        $perPage = (int) $request->get('per_page', 15);

        $handovers = $this->service->getHandovers($filters, $perPage);

        return response()->json([
            'success' => true,
            'data' => $handovers->items(),
            'meta' => [
                'current_page' => $handovers->currentPage(),
                'last_page' => $handovers->lastPage(),
                'per_page' => $handovers->perPage(),
                'total' => $handovers->total(),
            ],
        ]);
    }

    /**
     * Retrieve single handover protocol.
     */
    public function show(string $identifier): JsonResponse
    {
        $handover = $this->service->getHandover($identifier);

        return response()->json([
            'success' => true,
            'data' => $handover,
        ]);
    }

    /**
     * Initialize project handover protocol.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'unit_id' => 'nullable|exists:units,id',
            'client_id' => 'required|exists:clients,id',
            'handover_title' => 'nullable|string|max:255',
        ]);

        $userId = auth()->id() ?? 1;

        $handover = $this->service->initializeHandover(
            $validated['project_id'],
            $validated['unit_id'] ?? null,
            $validated['client_id'],
            $validated['handover_title'] ?? null,
            $userId
        );

        return response()->json([
            'success' => true,
            'message' => 'Project handover protocol initialized successfully',
            'data' => $handover,
        ], 201);
    }

    /**
     * Update handover dossier and municipal permits checklist.
     */
    public function updateDossier(Request $request, string $identifier): JsonResponse
    {
        $handover = $this->service->getHandover($identifier);

        $validated = $request->validate([
            'has_occupancy_permit' => 'nullable|boolean',
            'occupancy_permit_ref' => 'nullable|string|max:100',
            'occupancy_permit_issued_at' => 'nullable|date',
            'has_as_built_drawings' => 'nullable|boolean',
            'as_built_drawings_ref' => 'nullable|string|max:100',
            'has_mep_compliance_certs' => 'nullable|boolean',
            'mep_compliance_notes' => 'nullable|string',
            'has_warranty_manual' => 'nullable|boolean',
            'has_keys_inventory' => 'nullable|boolean',
            'key_sets_count' => 'nullable|integer|min:0',
            'handover_notes' => 'nullable|string',
            'project_director_signed' => 'nullable|boolean',
        ]);

        $updated = $this->service->updateDossier($handover, $validated);

        return response()->json([
            'success' => true,
            'message' => 'Handover dossier updated successfully',
            'data' => $updated,
        ]);
    }

    /**
     * Execute client digital signoff, deed of handover, and key release.
     */
    public function signoff(Request $request, string $identifier): JsonResponse
    {
        $handover = $this->service->getHandover($identifier);

        $validated = $request->validate([
            'client_signature_name' => 'required|string|max:150',
            'keys_received_by_name' => 'nullable|string|max:150',
            'key_sets_count' => 'nullable|integer|min:1',
            'dlp_period_days' => 'nullable|integer|min:30|max:730',
            'notes' => 'nullable|string',
        ]);

        $signed = $this->service->executeClientSignoff($handover, $validated, $request->ip());

        return response()->json([
            'success' => true,
            'message' => 'Deed of Handover executed & keys released with digital cryptographic seal',
            'data' => $signed,
        ]);
    }

    /**
     * Generate or recalculate end-to-end financial settlement audit.
     */
    public function generateAudit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'unit_id' => 'nullable|exists:units,id',
            'handover_id' => 'nullable|exists:project_handovers,id',
        ]);

        $settlement = $this->service->generateFinalSettlementAudit(
            $validated['project_id'],
            $validated['unit_id'] ?? null,
            $validated['handover_id'] ?? null
        );

        return response()->json([
            'success' => true,
            'message' => 'End-to-end financial settlement audit generated successfully',
            'data' => $settlement,
        ]);
    }

    /**
     * Finalize financial settlement and seal final accounts.
     */
    public function finalizeSettlement(Request $request, string $identifier): JsonResponse
    {
        $settlement = ProjectFinalSettlement::where('uuid', $identifier)
            ->orWhere('id', $identifier)
            ->firstOrFail();

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $auditorId = auth()->id() ?? 1;

        $finalized = $this->service->finalizeSettlement($settlement, $validated, $auditorId);

        return response()->json([
            'success' => true,
            'message' => 'Financial settlement finalized and project marked completed',
            'data' => $finalized,
        ]);
    }

    /**
     * Portfolio Capstone Summary Metrics.
     */
    public function capstoneSummary(): JsonResponse
    {
        $summary = $this->service->getCapstoneSummary();

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }
}
