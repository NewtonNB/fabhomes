<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ClientAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Exception;

class ClientPortalAuthController extends Controller
{
    protected ClientAuthService $authService;

    public function __construct(ClientAuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Self-Service Client Onboarding & Registration
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|string|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:25|unique:users,phone',
            'password' => 'required|string|min:8|confirmed',
            'pin' => 'nullable|string|regex:/^[0-9]{4,6}$/',
            'country' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'preferred_language' => 'nullable|string|in:en,lg,sw',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Registration validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->authService->registerClient($request->all(), $request);

            return response()->json([
                'success' => true,
                'message' => 'Client account created successfully. Welcome to Fab Homes Zimbani.',
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
     * Client Portal Sign-In (Email/Phone + Password)
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'login' => 'required|string',
            'password' => 'required|string',
            'device_name' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide valid credentials.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->authService->loginWithCredentials(
                $request->input('login'),
                $request->input('password'),
                $request->input('device_name'),
                $request
            );

            return response()->json([
                'success' => true,
                'message' => 'Signed in successfully.',
                'data' => $result,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 401);
        }
    }

    /**
     * Fast Quick-PIN Login (4-6 Digits)
     */
    public function pinLogin(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'login' => 'required|string',
            'pin' => 'required|string|regex:/^[0-9]{4,6}$/',
            'device_name' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide a valid 4 to 6 digit PIN.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->authService->loginWithPin(
                $request->input('login'),
                $request->input('pin'),
                $request->input('device_name'),
                $request
            );

            return response()->json([
                'success' => true,
                'message' => 'Quick-PIN unlocked successfully.',
                'data' => $result,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 401);
        }
    }

    /**
     * Biometric / WebAuthn Sign-In
     */
    public function biometricLogin(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'credential_id' => 'required|string',
            'signature' => 'nullable|string',
            'device_name' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid biometric credential payload.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->authService->loginWithBiometrics(
                $request->input('credential_id'),
                $request->input('signature'),
                $request->input('device_name'),
                $request
            );

            return response()->json([
                'success' => true,
                'message' => 'Biometric authentication verified.',
                'data' => $result,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 401);
        }
    }

    /**
     * Get Client Portfolio & Profile (Authenticated)
     */
    public function profile(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $data = $this->authService->getClientProfile($user);

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
     * Update Client Profile Details (Authenticated)
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'phone_secondary' => 'nullable|string|max:25',
            'address_line1' => 'nullable|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'nok_name' => 'nullable|string|max:150',
            'nok_relationship' => 'nullable|string|max:100',
            'nok_phone' => 'nullable|string|max:25',
            'nok_address' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Profile update validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();
            $updatedClient = $this->authService->updateProfile($user, $request->all());

            return response()->json([
                'success' => true,
                'message' => 'Client profile updated successfully.',
                'data' => $updatedClient,
            ], 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Submit KYC Identity Details & Optional Document
     */
    public function submitKyc(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'id_type' => 'required|string|in:national_id,passport,driving_license,alien_card,refugee_id',
            'id_number' => 'required|string|max:100',
            'id_expiry_date' => 'nullable|date',
            'kyc_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240', // max 10MB
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'KYC verification submission failed validation.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();
            $file = $request->file('kyc_document');
            $result = $this->authService->submitKyc($user, $request->all(), $file);

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
     * Set or Change 4-6 Digit Quick-PIN
     */
    public function setupPin(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pin' => 'required|string|regex:/^[0-9]{4,6}$/',
            'current_password' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Quick-PIN must be 4 to 6 numeric digits.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();
            $result = $this->authService->setupPin(
                $user,
                $request->input('pin'),
                $request->input('current_password')
            );

            return response()->json($result, 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Enable/Disable Biometrics (WebAuthn)
     */
    public function setupBiometrics(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'credential_id' => 'required|string',
            'device_name' => 'required|string|max:100',
            'enabled' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid biometric setup payload.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();
            $result = $this->authService->setupBiometrics(
                $user,
                $request->input('credential_id'),
                $request->input('device_name'),
                (bool) $request->input('enabled')
            );

            return response()->json($result, 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Update Notification Preferences & Language
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'preferred_language' => 'nullable|string|in:en,lg,sw',
            'notification_channels' => 'nullable|array',
            'two_factor_method' => 'nullable|string|in:none,email_otp,sms_otp',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid preferences data.',
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $user = $request->user();
            $result = $this->authService->updatePreferences($user, $request->all());

            return response()->json($result, 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Record PWA App Installation
     */
    public function recordPwaInstall(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $result = $this->authService->recordPwaInstall(
                $user,
                $request->input('device_info'),
                $request
            );

            return response()->json($result, 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * List Active Security Sessions / Devices
     */
    public function getSecuritySessions(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $result = $this->authService->getSecuritySessions($user, $request);

            return response()->json([
                'success' => true,
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
     * Revoke All Other Devices
     */
    public function revokeOtherSessions(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $result = $this->authService->revokeOtherSessions($user, $request);

            return response()->json($result, 200);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
