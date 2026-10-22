<?php

namespace App\Services;

use App\Models\Client;
use App\Models\ClientSecurityProfile;
use App\Models\Document;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Exception;

class ClientAuthService
{
    /**
     * Register a new client user with self-service onboarding.
     */
    public function registerClient(array $data, Request $request): array
    {
        return DB::transaction(function () use ($data, $request) {
            // Check if user already exists with this email or phone
            if (User::where('email', $data['email'])->exists()) {
                throw new Exception('An account with this email address already exists.');
            }

            if (!empty($data['phone']) && User::where('phone', $data['phone'])->exists()) {
                throw new Exception('An account with this phone number already exists.');
            }

            // 1. Create User
            $fullName = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
            if (empty($fullName)) {
                $fullName = $data['name'] ?? 'Client User';
            }

            $user = User::create([
                'name' => $fullName,
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => Hash::make($data['password']),
                'status' => 'active',
                'metadata' => [
                    'onboarding_channel' => 'client_portal_pwa',
                    'registered_at' => now()->toIso8601String(),
                ],
            ]);

            // Assign Spatie Role 'Client'
            if (method_exists($user, 'assignRole')) {
                $user->assignRole('Client');
            }

            // 2. Link or Create Client Profile
            $client = null;
            if (!empty($data['email'])) {
                $client = Client::where('email', $data['email'])->first();
            }
            if (!$client && !empty($data['phone'])) {
                $client = Client::where('phone_primary', $data['phone'])
                    ->orWhere('phone_secondary', $data['phone'])
                    ->first();
            }

            if ($client) {
                // Link existing client created in admin CRM to this user
                $client->update([
                    'user_id' => $user->id,
                    'status' => 'active',
                ]);
            } else {
                // Create brand new Client record
                $client = Client::create([
                    'user_id' => $user->id,
                    'first_name' => $data['first_name'] ?? explode(' ', $fullName)[0] ?? 'Valued',
                    'last_name' => $data['last_name'] ?? (explode(' ', $fullName)[1] ?? 'Client'),
                    'email' => $data['email'],
                    'phone_primary' => $data['phone'] ?? '+256700000000',
                    'status' => 'active',
                    'kyc_status' => 'pending',
                    'country' => $data['country'] ?? 'Uganda',
                    'city' => $data['city'] ?? 'Kampala',
                ]);
            }

            // 3. Initialize Security Profile
            $securityProfile = ClientSecurityProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'client_id' => $client->id,
                    'preferred_language' => $data['preferred_language'] ?? 'en',
                    'notification_channels' => [
                        'sms' => true,
                        'email' => true,
                        'whatsapp' => false,
                        'push' => true,
                    ],
                    'last_active_device' => $request->header('User-Agent') ? substr($request->header('User-Agent'), 0, 140) : 'PWA Mobile Web',
                    'last_active_ip' => $request->ip(),
                ]
            );

            // Optional initial Quick-PIN setup during onboarding
            $initialPin = $data['pin'] ?? $data['quick_pin'] ?? null;
            if (!empty($initialPin)) {
                $securityProfile->setPin((string) $initialPin);
            }

            // Create Sanctum Access Token
            $token = $user->createToken('pwa_client_token')->plainTextToken;

            return [
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'uuid' => $user->uuid,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'roles' => $user->getRoleNames(),
                ],
                'client' => $this->formatClientPayload($client),
                'security_profile' => $this->formatSecurityPayload($securityProfile),
            ];
        });
    }

    /**
     * Standard Login via Email/Phone + Password
     */
    public function loginWithCredentials(string $login, string $password, ?string $deviceName, Request $request): array
    {
        $loginType = filter_var($login, FILTER_VALIDATE_EMAIL) ? 'email' : 'phone';

        $user = User::where($loginType, $login)->first();

        // Also fallback to search Client by client_number or phone to get linked user
        if (!$user) {
            $clientCandidate = Client::where('client_number', $login)
                ->orWhere('phone_primary', $login)
                ->orWhere('email', $login)
                ->first();

            if ($clientCandidate && $clientCandidate->user) {
                $user = $clientCandidate->user;
            }
        }

        if (!$user || !Hash::check($password, $user->password)) {
            throw new Exception('Invalid login credentials provided.');
        }

        if ($user->status !== 'active') {
            throw new Exception('Account is currently ' . $user->status . '. Please contact support.');
        }

        $user->update(['last_login_at' => now()]);

        // Resolve or associate client
        $client = $this->resolveOrCreateClient($user);
        $securityProfile = $this->resolveOrCreateSecurityProfile($user, $client);

        // Update session audit info
        $securityProfile->update([
            'last_active_device' => $deviceName ?: substr((string) $request->header('User-Agent'), 0, 140),
            'last_active_ip' => $request->ip(),
        ]);

        $token = $user->createToken($deviceName ?: 'pwa_client_token')->plainTextToken;

        return [
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'uuid' => $user->uuid,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'roles' => $user->getRoleNames(),
            ],
            'client' => $this->formatClientPayload($client),
            'security_profile' => $this->formatSecurityPayload($securityProfile),
        ];
    }

    /**
     * Fast Quick-PIN Login (4-6 Digits)
     */
    public function loginWithPin(string $login, string $pin, ?string $deviceName, Request $request): array
    {
        // 1. Identify User
        $user = null;
        if (filter_var($login, FILTER_VALIDATE_EMAIL)) {
            $user = User::where('email', $login)->first();
        } else {
            $user = User::where('phone', $login)->first();
        }

        if (!$user) {
            $client = Client::where('client_number', $login)
                ->orWhere('phone_primary', $login)
                ->orWhere('email', $login)
                ->first();

            if ($client && $client->user) {
                $user = $client->user;
            }
        }

        if (!$user) {
            throw new Exception('Account not found for the provided identifier.');
        }

        $client = $this->resolveOrCreateClient($user);
        $securityProfile = $this->resolveOrCreateSecurityProfile($user, $client);

        // 2. Validate PIN existence
        if (empty($securityProfile->pin_hash)) {
            throw new Exception('Quick-PIN has not been set up for this account yet. Please sign in with your password first.');
        }

        // 3. Check lockout
        if ($securityProfile->isPinLocked()) {
            $minutesLeft = max(1, (int) now()->diffInMinutes($securityProfile->pin_locked_until, false));
            throw new Exception("PIN access temporarily locked due to failed attempts. Please retry in {$minutesLeft} minute(s) or use your password.");
        }

        // 4. Verify PIN
        if (!$securityProfile->verifyPin($pin)) {
            $attempts = $securityProfile->recordFailedPinAttempt();
            $remaining = max(0, 5 - $attempts);

            if ($remaining === 0) {
                throw new Exception('Too many incorrect attempts. Quick-PIN locked for 15 minutes. Use your password to sign in.');
            }

            throw new Exception("Incorrect Quick-PIN. {$remaining} attempt(s) remaining.");
        }

        // 5. Successful PIN verification
        $securityProfile->resetPinAttempts();
        $securityProfile->update([
            'last_active_device' => $deviceName ?: substr((string) $request->header('User-Agent'), 0, 140),
            'last_active_ip' => $request->ip(),
        ]);

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken($deviceName ?: 'pwa_pin_token')->plainTextToken;

        return [
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'uuid' => $user->uuid,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'roles' => $user->getRoleNames(),
            ],
            'client' => $this->formatClientPayload($client),
            'security_profile' => $this->formatSecurityPayload($securityProfile),
        ];
    }

    /**
     * Biometric / WebAuthn Login
     */
    public function loginWithBiometrics(string $credentialId, ?string $signature, ?string $deviceName, Request $request): array
    {
        $profile = ClientSecurityProfile::where('biometric_credential_id', $credentialId)
            ->where('biometric_enabled', true)
            ->first();

        if (!$profile) {
            throw new Exception('Biometric credential not recognized or has been revoked. Please sign in with password.');
        }

        $user = $profile->user;
        if (!$user || $user->status !== 'active') {
            throw new Exception('User account is inactive or disabled.');
        }

        $client = $profile->client ?: $this->resolveOrCreateClient($user);

        $profile->update([
            'last_active_device' => $deviceName ?: substr((string) $request->header('User-Agent'), 0, 140),
            'last_active_ip' => $request->ip(),
        ]);

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken($deviceName ?: 'pwa_biometric_token')->plainTextToken;

        return [
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'uuid' => $user->uuid,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'roles' => $user->getRoleNames(),
            ],
            'client' => $this->formatClientPayload($client),
            'security_profile' => $this->formatSecurityPayload($profile),
        ];
    }

    /**
     * Get Comprehensive Client Profile with Real-Time Portfolio Statistics
     */
    public function getClientProfile(User $user): array
    {
        $client = $this->resolveOrCreateClient($user);
        $securityProfile = $this->resolveOrCreateSecurityProfile($user, $client);

        // Portfolio Stats
        $savingsAccounts = $client->savingsAccounts()->get();
        $totalSavingsBalance = (float) $savingsAccounts->sum('current_balance');
        $totalSavingsTarget = (float) $savingsAccounts->sum('target_amount');
        $savingsCount = $savingsAccounts->count();

        $units = $client->units()->with('project')->get();
        $plotsCount = $units->count();
        $uniqueProjects = $units->pluck('project_id')->filter()->unique()->count();

        $pendingMilestonesCount = $client->milestoneVerifications()
            ->where('client_approval_status', 'pending')
            ->count();

        $documentsCount = Document::where('documentable_type', Client::class)
            ->where('documentable_id', $client->id)
            ->count();

        return [
            'client' => $this->formatClientPayload($client),
            'security' => $this->formatSecurityPayload($securityProfile),
            'portfolio' => [
                'savings_count' => $savingsCount,
                'total_savings_balance' => $totalSavingsBalance,
                'total_savings_target' => $totalSavingsTarget,
                'savings_completion_pct' => $totalSavingsTarget > 0 ? round(($totalSavingsBalance / $totalSavingsTarget) * 100, 1) : 0,
                'plots_count' => $plotsCount,
                'projects_count' => $uniqueProjects,
                'pending_milestones_count' => $pendingMilestonesCount,
                'documents_count' => $documentsCount,
            ],
        ];
    }

    /**
     * Update Client Profile Details
     */
    public function updateProfile(User $user, array $data): array
    {
        $client = $this->resolveOrCreateClient($user);

        $clientUpdates = [];
        $allowedFields = [
            'first_name', 'middle_name', 'last_name', 'phone_secondary',
            'address_line1', 'address_line2', 'city', 'district', 'country', 'postal_code',
            'date_of_birth', 'gender',
            'nok_name', 'nok_relationship', 'nok_phone', 'nok_address',
        ];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $clientUpdates[$field] = $data[$field];
            }
        }

        if (!empty($clientUpdates)) {
            $clientUpdates['updated_by'] = $user->id;
            $client->update($clientUpdates);
        }

        // Sync name on User model if first/last name changed
        if (!empty($data['first_name']) || !empty($data['last_name'])) {
            $user->update([
                'name' => trim(($client->first_name ?? '') . ' ' . ($client->last_name ?? '')),
            ]);
        }

        return $this->formatClientPayload($client->fresh());
    }

    /**
     * Submit KYC Identity Details & Optional Document Upload
     */
    public function submitKyc(User $user, array $data, $uploadedFile = null): array
    {
        $client = $this->resolveOrCreateClient($user);

        $client->update([
            'id_type' => $data['id_type'] ?? $client->id_type,
            'id_number' => $data['id_number'] ?? $client->id_number,
            'id_expiry_date' => $data['id_expiry_date'] ?? $client->id_expiry_date,
            'kyc_status' => 'pending',
            'updated_by' => $user->id,
        ]);

        $createdDoc = null;
        if ($uploadedFile && $uploadedFile->isValid()) {
            $path = $uploadedFile->store('documents/' . date('Y/m'), 'public');

            $createdDoc = Document::create([
                'uuid' => (string) Str::uuid(),
                'title' => 'KYC Identification (' . strtoupper($data['id_type'] ?? 'ID') . ') - ' . $client->client_number,
                'document_type' => 'identification_kyc',
                'file_name' => $uploadedFile->getClientOriginalName(),
                'file_path' => $path,
                'file_size' => $uploadedFile->getSize(),
                'mime_type' => $uploadedFile->getClientMimeType(),
                'documentable_type' => Client::class,
                'documentable_id' => $client->id,
                'status' => 'active',
                'verification_status' => 'pending',
                'created_by' => $user->id,
            ]);
        }

        return [
            'client' => $this->formatClientPayload($client->fresh()),
            'document' => $createdDoc ? [
                'uuid' => $createdDoc->uuid,
                'title' => $createdDoc->title,
                'file_name' => $createdDoc->file_name,
                'verification_status' => $createdDoc->verification_status,
            ] : null,
            'message' => 'KYC identification submitted successfully. Pending compliance verification.',
        ];
    }

    /**
     * Setup or Change 4-6 Digit Quick-PIN
     */
    public function setupPin(User $user, string $pin, ?string $currentPassword = null): array
    {
        // Enforce 4-6 numeric digits
        if (!preg_match('/^[0-9]{4,6}$/', $pin)) {
            throw new Exception('Quick-PIN must consist of 4 to 6 numeric digits.');
        }

        $client = $this->resolveOrCreateClient($user);
        $securityProfile = $this->resolveOrCreateSecurityProfile($user, $client);

        // If user already has a PIN or password, verify current password
        if (!empty($securityProfile->pin_hash) && !empty($user->password)) {
            if (empty($currentPassword) || !Hash::check($currentPassword, $user->password)) {
                throw new Exception('Current account password is required to change your Quick-PIN.');
            }
        }

        $securityProfile->setPin($pin);

        return [
            'success' => true,
            'message' => 'Quick-PIN has been set successfully. You can now use it for fast mobile login.',
            'security' => $this->formatSecurityPayload($securityProfile->fresh()),
        ];
    }

    /**
     * Setup Biometric WebAuthn Credential
     */
    public function setupBiometrics(User $user, string $credentialId, string $deviceName, bool $enabled = true): array
    {
        $client = $this->resolveOrCreateClient($user);
        $securityProfile = $this->resolveOrCreateSecurityProfile($user, $client);

        $securityProfile->update([
            'biometric_enabled' => $enabled,
            'biometric_credential_id' => $enabled ? $credentialId : null,
            'biometric_device_name' => $enabled ? $deviceName : null,
            'biometric_registered_at' => $enabled ? now() : null,
        ]);

        return [
            'success' => true,
            'message' => $enabled ? 'Biometric authentication registered and enabled.' : 'Biometric authentication disabled.',
            'security' => $this->formatSecurityPayload($securityProfile->fresh()),
        ];
    }

    /**
     * Update Notification Preferences & Preferred Language
     */
    public function updatePreferences(User $user, array $data): array
    {
        $client = $this->resolveOrCreateClient($user);
        $securityProfile = $this->resolveOrCreateSecurityProfile($user, $client);

        $updates = [];
        if (isset($data['preferred_language'])) {
            $updates['preferred_language'] = $data['preferred_language'];
        }

        if (isset($data['notification_channels']) && is_array($data['notification_channels'])) {
            $currentChannels = $securityProfile->notification_channels ?: [];
            $updates['notification_channels'] = array_merge($currentChannels, $data['notification_channels']);
        }

        if (isset($data['two_factor_method'])) {
            $updates['two_factor_method'] = $data['two_factor_method'];
        }

        if (!empty($updates)) {
            $securityProfile->update($updates);
        }

        return [
            'success' => true,
            'message' => 'Preferences updated successfully.',
            'security' => $this->formatSecurityPayload($securityProfile->fresh()),
        ];
    }

    /**
     * Record PWA App Installation on Client Device
     */
    public function recordPwaInstall(User $user, ?string $deviceInfo, Request $request): array
    {
        $client = $this->resolveOrCreateClient($user);
        $securityProfile = $this->resolveOrCreateSecurityProfile($user, $client);

        $securityProfile->update([
            'pwa_installed' => true,
            'pwa_installed_at' => now(),
            'last_active_device' => $deviceInfo ?: substr((string) $request->header('User-Agent'), 0, 140),
            'last_active_ip' => $request->ip(),
        ]);

        return [
            'success' => true,
            'message' => 'PWA installation recorded successfully.',
            'security' => $this->formatSecurityPayload($securityProfile->fresh()),
        ];
    }

    /**
     * Get Active Security Sessions / Devices
     */
    public function getSecuritySessions(User $user, Request $request): array
    {
        $client = $this->resolveOrCreateClient($user);
        $securityProfile = $this->resolveOrCreateSecurityProfile($user, $client);

        $currentTokenId = $user->currentAccessToken()?->id;

        $tokens = $user->tokens()
            ->orderBy('last_used_at', 'desc')
            ->get()
            ->map(function ($token) use ($currentTokenId) {
                return [
                    'id' => $token->id,
                    'name' => $token->name,
                    'is_current' => $token->id === $currentTokenId,
                    'created_at' => $token->created_at?->toIso8601String(),
                    'last_used_at' => $token->last_used_at?->toIso8601String() ?: $token->created_at?->toIso8601String(),
                ];
            });

        return [
            'security_profile' => $this->formatSecurityPayload($securityProfile),
            'sessions' => $tokens,
            'total_active_sessions' => $tokens->count(),
        ];
    }

    /**
     * Revoke All Other Sessions / Devices Except Current
     */
    public function revokeOtherSessions(User $user, Request $request): array
    {
        $currentTokenId = $user->currentAccessToken()?->id;

        if ($currentTokenId) {
            $user->tokens()->where('id', '!=', $currentTokenId)->delete();
        }

        return [
            'success' => true,
            'message' => 'All other devices and active sessions have been signed out.',
        ];
    }

    // --- Helper Utilities ---

    public function resolveOrCreateClient(User $user): Client
    {
        if ($user->client) {
            return $user->client;
        }

        $client = Client::where('user_id', $user->id)->first();
        if ($client) {
            return $client;
        }

        if (!empty($user->email)) {
            $client = Client::where('email', $user->email)->first();
            if ($client) {
                $client->update(['user_id' => $user->id]);
                return $client;
            }
        }

        if (!empty($user->phone)) {
            $client = Client::where('phone_primary', $user->phone)->first();
            if ($client) {
                $client->update(['user_id' => $user->id]);
                return $client;
            }
        }

        // Auto-provision client profile for this user
        $nameParts = explode(' ', trim($user->name ?: 'Client User'), 2);
        return Client::create([
            'user_id' => $user->id,
            'first_name' => $nameParts[0] ?? 'Valued',
            'last_name' => $nameParts[1] ?? 'Client',
            'email' => $user->email,
            'phone_primary' => $user->phone ?: '+256700000000',
            'status' => 'active',
            'kyc_status' => 'pending',
            'country' => 'Uganda',
            'city' => 'Kampala',
        ]);
    }

    public function resolveOrCreateSecurityProfile(User $user, Client $client): ClientSecurityProfile
    {
        return ClientSecurityProfile::firstOrCreate(
            ['user_id' => $user->id],
            [
                'client_id' => $client->id,
                'preferred_language' => 'en',
                'notification_channels' => [
                    'sms' => true,
                    'email' => true,
                    'whatsapp' => false,
                    'push' => true,
                ],
            ]
        );
    }

    private function formatClientPayload(Client $client): array
    {
        return [
            'id' => $client->id,
            'uuid' => $client->uuid,
            'client_number' => $client->client_number,
            'first_name' => $client->first_name,
            'middle_name' => $client->middle_name,
            'last_name' => $client->last_name,
            'full_name' => trim("{$client->first_name} {$client->middle_name} {$client->last_name}"),
            'email' => $client->email,
            'phone_primary' => $client->phone_primary,
            'phone_secondary' => $client->phone_secondary,
            'address_line1' => $client->address_line1,
            'address_line2' => $client->address_line2,
            'city' => $client->city,
            'district' => $client->district,
            'country' => $client->country,
            'postal_code' => $client->postal_code,
            'date_of_birth' => $client->date_of_birth?->format('Y-m-d'),
            'gender' => $client->gender,
            'id_type' => $client->id_type,
            'id_number' => $client->id_number,
            'id_expiry_date' => $client->id_expiry_date?->format('Y-m-d'),
            'nok_name' => $client->nok_name,
            'nok_relationship' => $client->nok_relationship,
            'nok_phone' => $client->nok_phone,
            'nok_address' => $client->nok_address,
            'status' => $client->status,
            'kyc_status' => $client->kyc_status,
            'kyc_verified_at' => $client->kyc_verified_at?->toIso8601String(),
        ];
    }

    private function formatSecurityPayload(ClientSecurityProfile $profile): array
    {
        return [
            'uuid' => $profile->uuid,
            'has_pin' => !empty($profile->pin_hash),
            'pin_set_at' => $profile->pin_set_at?->toIso8601String(),
            'is_pin_locked' => $profile->isPinLocked(),
            'biometric_enabled' => (bool) $profile->biometric_enabled,
            'biometric_device_name' => $profile->biometric_device_name,
            'biometric_registered_at' => $profile->biometric_registered_at?->toIso8601String(),
            'two_factor_method' => $profile->two_factor_method,
            'preferred_language' => $profile->preferred_language,
            'notification_channels' => $profile->notification_channels ?: [
                'sms' => true,
                'email' => true,
                'whatsapp' => false,
                'push' => true,
            ],
            'pwa_installed' => (bool) $profile->pwa_installed,
            'pwa_installed_at' => $profile->pwa_installed_at?->toIso8601String(),
            'last_active_device' => $profile->last_active_device,
            'last_active_ip' => $profile->last_active_ip,
        ];
    }
}
