<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ClientSavingsPortalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Exception;

class ClientPortalSavingsController extends Controller
{
    protected ClientSavingsPortalService $savingsService;

    public function __construct(ClientSavingsPortalService $savingsService)
    {
        $this->savingsService = $savingsService;
    }

    /**
     * Get Client Savings Overview & Account Breakdown
     */
    public function overview(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $data = $this->savingsService->getSavingsOverview($user);

            return response()->json([
                'success' => true,
                'data' => $data,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get Details for a Single Savings Account
     */
    public function show(Request $request, string $identifier): JsonResponse
    {
        try {
            $user = $request->user();
            $data = $this->savingsService->getSavingsAccountDetails($user, $identifier);

            return response()->json([
                'success' => true,
                'data' => $data,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Get Filtered Transaction History
     */
    public function transactions(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $data = $this->savingsService->getTransactions($user, $request->all());

            return response()->json([
                'success' => true,
                'data' => $data,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Initiate Self-Service Savings Deposit Checkout
     */
    public function initiateDeposit(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'account_id' => 'required',
            'amount' => 'required|numeric|min:1000',
            'gateway' => 'nullable|string|in:mtn_momo,airtel_money,stanbic_bank,flexipay',
            'phone_number' => 'nullable|string|max:25',
            'narration' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Deposit request validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();
            $result = $this->savingsService->initiateDeposit($user, $request->all(), $request);

            return response()->json([
                'success' => true,
                'message' => 'Deposit intent initialized. Awaiting payment authorization.',
                'data' => $result,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Confirm Deposit Payment & Post Real-Time Credit
     */
    public function confirmDeposit(Request $request, string $identifier): JsonResponse
    {
        try {
            $user = $request->user();
            $result = $this->savingsService->confirmDeposit($user, $identifier);

            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'data' => $result,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get Visual Milestone Progress Trackers
     */
    public function milestoneTrackers(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $data = $this->savingsService->getMilestoneProgressTrackers($user);

            return response()->json([
                'success' => true,
                'data' => $data,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
