<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BankReconciliationStagingService;
use App\Services\PaymentSimulationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentSimulationReconciliationController extends Controller
{
    public function __construct(
        protected PaymentSimulationService $simulationService,
        protected BankReconciliationStagingService $reconciliationService
    ) {}

    /**
     * Run a single sandbox simulation scenario.
     */
    public function runSimulation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'scenario_name' => 'required|string',
        ]);

        $simulation = $this->simulationService->runScenario($validated['scenario_name'], auth()->id());

        return response()->json([
            'success' => true,
            'message' => "Scenario '{$simulation->scenario_name}' completed with status: {$simulation->status}.",
            'data' => $simulation,
        ]);
    }

    /**
     * Run all test harness scenarios.
     */
    public function runAllSimulations(): JsonResponse
    {
        $results = $this->simulationService->runAllScenarios(auth()->id());

        return response()->json([
            'success' => true,
            'message' => 'All payment sandbox scenarios executed successfully.',
            'data' => $results,
        ]);
    }

    /**
     * Get simulation execution history.
     */
    public function simulationHistory(): JsonResponse
    {
        $history = $this->simulationService->getHistory();

        return response()->json([
            'success' => true,
            'data' => $history,
        ]);
    }

    /**
     * List bank reconciliation statement batches.
     */
    public function listBatches(Request $request): JsonResponse
    {
        $filters = $request->only(['status', 'bank_name']);
        $batches = $this->reconciliationService->getBatches($filters);

        return response()->json([
            'success' => true,
            'data' => $batches,
        ]);
    }

    /**
     * Seed a demo bank statement batch for test verification.
     */
    public function seedDemoBatch(): JsonResponse
    {
        $batch = $this->reconciliationService->seedDemoBatch(auth()->id());

        return response()->json([
            'success' => true,
            'message' => "Sample Stanbic Bank statement batch {$batch->batch_number} seeded with 10 statement lines.",
            'data' => $batch,
        ], 201);
    }

    /**
     * Show single bank reconciliation batch details with entries.
     */
    public function showBatch(string $id): JsonResponse
    {
        $batch = $this->reconciliationService->getBatchDetails($id);

        return response()->json([
            'success' => true,
            'data' => $batch,
        ]);
    }

    /**
     * Execute automated rule-based reconciliation for a batch.
     */
    public function autoReconcile(string $id): JsonResponse
    {
        $batch = $this->reconciliationService->autoReconcileBatch($id, auth()->id());

        return response()->json([
            'success' => true,
            'message' => "Automated reconciliation completed. {$batch->matched_entries_count}/{$batch->total_entries_count} entries matched.",
            'data' => $batch,
        ]);
    }

    /**
     * Manually match a bank statement entry with a payment.
     */
    public function manualMatch(Request $request, int $entryId): JsonResponse
    {
        $validated = $request->validate([
            'payment_id' => 'required|integer|exists:payments,id',
            'notes' => 'nullable|string|max:500',
        ]);

        $entry = $this->reconciliationService->manualMatchEntry($entryId, $validated['payment_id'], $validated['notes'] ?? null);

        return response()->json([
            'success' => true,
            'message' => "Statement entry {$entry->entry_reference} manually matched.",
            'data' => $entry,
        ]);
    }
}
