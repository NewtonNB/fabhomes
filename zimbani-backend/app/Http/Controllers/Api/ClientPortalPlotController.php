<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ClientPlotReservationService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientPortalPlotController extends Controller
{
    protected ClientPlotReservationService $plotService;

    public function __construct(ClientPlotReservationService $plotService)
    {
        $this->plotService = $plotService;
    }

    /**
     * Get Plots with filters & reservation status
     */
    public function getPlots(Request $request): JsonResponse
    {
        $filters = $request->only([
            'project_id',
            'status',
            'min_price',
            'max_price',
            'search',
        ]);

        $data = $this->plotService->getPlots($request->user(), $filters);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get Interactive Estate Masterplan Map Data
     */
    public function getEstateMap(Request $request): JsonResponse
    {
        $projectId = $request->query('project_id') ? (int) $request->query('project_id') : null;
        $data = $this->plotService->getEstateMap($request->user(), $projectId);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Place a Plot Reservation (with Fee / Intent)
     */
    public function reservePlot(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'unit_id' => 'nullable|integer',
            'unit_uuid' => 'nullable|string',
            'reservation_fee' => 'nullable|numeric|min:100000',
            'gateway' => 'nullable|string|in:mtn_momo,airtel_money,stanbic_bank,flexipay',
            'phone_number' => 'nullable|string',
            'notes' => 'nullable|string|max:500',
        ]);

        if (empty($validated['unit_id']) && empty($validated['unit_uuid'])) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide a valid unit_id or unit_uuid.',
            ], 422);
        }

        try {
            $result = $this->plotService->reservePlot($request->user(), $validated, $request);

            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'data' => [
                    'reservation' => $result['reservation'],
                    'receipt' => $result['receipt'],
                ],
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get Client's Active & Historical Reservations
     */
    public function getClientReservations(Request $request): JsonResponse
    {
        $data = $this->plotService->getClientReservations($request->user());

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Cancel an Active Reservation
     */
    public function cancelReservation(Request $request, string $uuid): JsonResponse
    {
        $reason = $request->input('reason', '');

        try {
            $result = $this->plotService->cancelReservation($request->user(), $uuid, $reason);

            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'data' => $result,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get Client's Land Titles & Deed Processing Trackers
     */
    public function getLandTitleDeeds(Request $request): JsonResponse
    {
        $data = $this->plotService->getLandTitleDeeds($request->user());

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}
