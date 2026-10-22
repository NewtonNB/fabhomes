<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ClientPortalMilestoneService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Exception;

class ClientPortalMilestoneController extends Controller
{
    protected ClientPortalMilestoneService $service;

    public function __construct(ClientPortalMilestoneService $service)
    {
        $this->service = $service;
    }

    /**
     * List milestone verifications for the client.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $client = $this->service->resolveClientForUser($user, $request->query('client_id'));

            $verifications = $this->service->getClientVerifications($client, $request->all());

            return response()->json($verifications);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Show milestone verification details with photo gallery.
     */
    public function show(Request $request, string $uuid): JsonResponse
    {
        try {
            $user = $request->user();
            $client = $this->service->resolveClientForUser($user, $request->query('client_id'));

            $verification = $this->service->getClientVerificationDetails($uuid, $client);

            return response()->json([
                'success' => true,
                'data' => $verification,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Client authorizes milestone completion and escrow payment release.
     */
    public function authorizeVerification(Request $request, string $uuid): JsonResponse
    {
        $request->validate([
            'feedback' => 'nullable|string|max:1000',
            'pin' => 'nullable|string|max:20',
        ]);

        try {
            $verification = $this->service->clientAuthorize(
                $uuid,
                $request->user(),
                $request->input('feedback'),
                $request->input('pin')
            );

            return response()->json([
                'success' => true,
                'message' => 'Milestone progress verified and payment release authorized successfully.',
                'data' => $verification,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Client disputes milestone verification and logs snags/defects.
     */
    public function disputeVerification(Request $request, string $uuid): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|min:5|max:2000',
            'flagged_photo_ids' => 'nullable|array',
            'flagged_photo_ids.*' => 'string',
            'category' => 'nullable|string|in:structural,architectural,plumbing,electrical,finishing,safety,other',
        ]);

        try {
            $verification = $this->service->clientDispute(
                $uuid,
                $request->user(),
                $request->input('reason'),
                $request->input('flagged_photo_ids', []),
                $request->input('category', 'finishing')
            );

            return response()->json([
                'success' => true,
                'message' => 'Milestone dispute registered. Punch list snag items logged for site engineering team.',
                'data' => $verification,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Upload a new progress photo for a milestone verification.
     */
    public function uploadPhoto(Request $request, string $uuid): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'caption' => 'nullable|string|max:1000',
            'photo_url' => 'required|string|max:500',
            'thumbnail_url' => 'nullable|string|max:500',
            'photo_stage' => 'nullable|string|in:pre_work,during_construction,reinforcement_check,concrete_pour,masonry_framing,mep_installation,finishes,completed_stage,defect_snag',
            'captured_at' => 'nullable|date',
            'gps_latitude' => 'nullable|numeric|between:-90,90',
            'gps_longitude' => 'nullable|numeric|between:-180,180',
            'gps_accuracy' => 'nullable|numeric',
            'camera_make_model' => 'nullable|string|max:255',
            'is_client_visible' => 'nullable|boolean',
            'is_featured' => 'nullable|boolean',
        ]);

        try {
            $photo = $this->service->uploadProgressPhoto($uuid, $request->all(), $request->user());

            return response()->json([
                'success' => true,
                'message' => 'Milestone progress photo uploaded successfully.',
                'data' => $photo,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Client flags a specific photo with snag notes.
     */
    public function flagPhoto(Request $request, string $uuid): JsonResponse
    {
        $request->validate([
            'notes' => 'required|string|min:3|max:1000',
        ]);

        try {
            $photo = $this->service->flagPhoto($uuid, $request->user(), $request->input('notes'));

            return response()->json([
                'success' => true,
                'message' => 'Photo flagged for site inspection review.',
                'data' => $photo,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Client reports a direct defect / punch-list snag item.
     */
    public function reportDefect(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'unit_id' => 'nullable|integer',
            'project_id' => 'nullable|integer',
            'site_id' => 'nullable|integer',
            'title' => 'required|string|max:255',
            'description' => 'required|string|max:2000',
            'photo_url' => 'nullable|string|max:500',
            'location_details' => 'nullable|string|max:255',
            'category' => 'nullable|string|in:structural,architectural,plumbing,electrical,finishing,safety,other',
            'severity' => 'nullable|string|in:low,medium,high,critical',
        ]);

        try {
            $item = $this->service->reportDefect($request->user(), $validated);

            return response()->json([
                'success' => true,
                'message' => 'Defect punch-list item submitted successfully. Site management alerted.',
                'data' => $item,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get client's punch list items.
     */
    public function getPunchListItems(Request $request): JsonResponse
    {
        try {
            $data = $this->service->getClientPunchListItems($request->user());

            return response()->json([
                'success' => true,
                'data' => $data,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get Client milestone portal summary KPI statistics.
     */
    public function summary(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $client = $this->service->resolveClientForUser($user, $request->query('client_id'));

            $summary = $this->service->getClientSummary($client);

            return response()->json([
                'success' => true,
                'data' => $summary,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
