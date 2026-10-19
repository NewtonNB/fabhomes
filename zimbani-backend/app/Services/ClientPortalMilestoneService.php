<?php

namespace App\Services;

use App\Models\MilestoneVerification;
use App\Models\MilestonePaymentRelease;
use App\Models\MilestoneProgressPhoto;
use App\Models\Client;
use App\Models\Unit;
use App\Models\User;
use App\Models\PunchListItem;
use App\Models\Activity;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Exception;

class ClientPortalMilestoneService
{
    /**
     * Resolve Client profile for an authenticated User.
     */
    public function resolveClientForUser(User $user, ?string $explicitClientId = null): ?Client
    {
        // If staff/admin and explicit client ID/UUID given, use that
        if (!empty($explicitClientId) && $user->hasAnyRole(['Super Admin', 'Admin', 'Company Admin', 'Site Manager', 'Finance Officer'])) {
            return Client::where('uuid', $explicitClientId)
                ->orWhere('id', $explicitClientId)
                ->first();
        }

        // Direct relation via user_id
        if ($user->client) {
            return $user->client;
        }

        // Fallback: match by email or phone
        $client = Client::where('user_id', $user->id)->first();
        if ($client) {
            return $client;
        }

        if (!empty($user->email)) {
            $client = Client::where('email', $user->email)->first();
            if ($client) {
                // Link client to user for future queries
                $client->update(['user_id' => $user->id]);
                return $client;
            }
        }

        return null;
    }

    /**
     * List Milestone Verifications for the Client.
     */
    public function getClientVerifications(?Client $client, array $filters = [])
    {
        $query = MilestoneVerification::with([
            'milestone',
            'project',
            'unit',
            'client',
            'siteEngineer:id,name,email',
            'quantitySurveyor:id,name,email',
            'paymentReleases',
            'progressPhotos' => function ($q) {
                $q->where('is_client_visible', true)->orderBy('captured_at');
            },
        ]);

        if ($client) {
            $unitIds = Unit::where('client_id', $client->id)
                ->orWhere('client_id', $client->user_id)
                ->pluck('id')
                ->toArray();

            $query->where(function (Builder $q) use ($client, $unitIds) {
                $q->where('client_id', $client->id);
                if (!empty($unitIds)) {
                    $q->orWhereIn('unit_id', $unitIds);
                }
            });
        }

        // Stage filter
        if (!empty($filters['stage'])) {
            $query->where('stage', $filters['stage']);
        }

        // Approval status filter
        if (!empty($filters['client_approval_status'])) {
            $query->where('client_approval_status', $filters['client_approval_status']);
        }

        // Project filter
        if (!empty($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }

        // Unit filter
        if (!empty($filters['unit_id'])) {
            $query->where('unit_id', $filters['unit_id']);
        }

        // Search
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('verification_number', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%");
            });
        }

        $perPage = intval($filters['per_page'] ?? 15);
        return $query->latest('inspection_date')->paginate($perPage);
    }

    /**
     * Get detailed verification view with full photo gallery and payment release breakdown.
     */
    public function getClientVerificationDetails(string $uuid, ?Client $client): MilestoneVerification
    {
        $verification = MilestoneVerification::where('uuid', $uuid)
            ->with([
                'milestone',
                'project',
                'site',
                'unit',
                'client',
                'siteEngineer:id,name,email',
                'quantitySurveyor:id,name,email',
                'paymentReleases.savingsAccount',
                'progressPhotos' => function ($q) {
                    $q->where('is_client_visible', true)->orderBy('captured_at');
                },
            ])
            ->firstOrFail();

        // Enforce ownership if client
        if ($client) {
            $isDirectClient = ($verification->client_id === $client->id);
            $ownsUnit = $verification->unit_id && Unit::where('id', $verification->unit_id)
                ->where(function ($q) use ($client) {
                    $q->where('client_id', $client->id)
                      ->orWhere('client_id', $client->user_id);
                })
                ->exists();

            if (!$isDirectClient && !$ownsUnit) {
                throw new Exception("Unauthorized: You do not own the property unit linked to this milestone verification.");
            }
        }

        return $verification;
    }

    /**
     * Client authorizes milestone progress & payment release.
     */
    public function clientAuthorize(string $uuid, User $user, ?string $feedback = null, ?string $pin = null): MilestoneVerification
    {
        return DB::transaction(function () use ($uuid, $user, $feedback) {
            $client = $this->resolveClientForUser($user);
            $verification = $this->getClientVerificationDetails($uuid, $client);

            if ($verification->client_approval_status === 'approved') {
                throw new Exception("This milestone verification is already approved by the client.");
            }

            $verification->update([
                'client_approval_status' => 'approved',
                'client_user_id' => $user->id,
                'client_signed_at' => now(),
                'client_feedback' => $feedback ?: 'Milestone construction verified and approved on client portal.',
                'stage' => 'client_approved',
            ]);

            // Notify / update associated payment release
            $release = MilestonePaymentRelease::where('milestone_verification_id', $verification->id)->first();
            if ($release) {
                $note = "Client ({$user->name}) signed off on portal at " . now()->format('Y-m-d H:i') . ". Ready for finance release.";
                $existingNotes = $release->notes ? $release->notes . " | " . $note : $note;
                $release->update(['notes' => $existingNotes]);
            }

            Activity::create([
                'user_id' => $user->id,
                'type' => 'milestone_verification_client_authorized',
                'entity_type' => MilestoneVerification::class,
                'entity_id' => $verification->id,
                'description' => "Client {$user->name} authorized milestone verification {$verification->verification_number}",
                'properties' => [
                    'verification_id' => $verification->id,
                    'verification_number' => $verification->verification_number,
                    'feedback' => $feedback,
                ],
            ]);

            return $verification->fresh([
                'milestone',
                'project',
                'unit',
                'paymentReleases',
                'progressPhotos',
            ]);
        });
    }

    /**
     * Client disputes milestone verification and logs snags / defects.
     */
    public function clientDispute(string $uuid, User $user, string $reason, array $flaggedPhotoIds = [], string $category = 'finishing'): MilestoneVerification
    {
        return DB::transaction(function () use ($uuid, $user, $reason, $flaggedPhotoIds, $category) {
            $client = $this->resolveClientForUser($user);
            $verification = $this->getClientVerificationDetails($uuid, $client);

            $verification->update([
                'client_approval_status' => 'disputed',
                'client_user_id' => $user->id,
                'client_signed_at' => now(),
                'client_feedback' => $reason,
                'rejection_reason' => $reason,
                'stage' => 'rejected',
            ]);

            // Flag photos if selected
            if (!empty($flaggedPhotoIds)) {
                MilestoneProgressPhoto::where('milestone_verification_id', $verification->id)
                    ->where(function ($q) use ($flaggedPhotoIds) {
                        $q->whereIn('id', $flaggedPhotoIds)
                          ->orWhereIn('uuid', $flaggedPhotoIds);
                    })
                    ->update([
                        'client_flagged' => true,
                        'client_flag_notes' => $reason,
                        'client_flagged_at' => now(),
                        'client_flagged_by' => $user->id,
                    ]);
            }

            // Auto-log Punch List Item (Snag) for site team to inspect
            if ($verification->site_id) {
                $itemNumber = 'SNAG-' . now()->format('Ymd') . '-' . str_pad(rand(100, 999), 3, '0', STR_PAD_LEFT);
                PunchListItem::create([
                    'item_number' => $itemNumber,
                    'site_id' => $verification->site_id,
                    'project_id' => $verification->project_id,
                    'unit_id' => $verification->unit_id,
                    'title' => 'Client Milestone Snag: ' . Str::limit($reason, 50),
                    'description' => "Disputed by {$user->name} on Client Portal for {$verification->verification_number} ({$verification->title}):\n{$reason}",
                    'location_details' => $verification->unit ? "Unit {$verification->unit->unit_number}" : 'Project Site',
                    'category' => in_array($category, ['structural', 'architectural', 'plumbing', 'electrical', 'finishing', 'safety', 'other']) ? $category : 'finishing',
                    'severity' => 'high',
                    'status' => 'open',
                    'reported_by' => $user->id,
                ]);
            }

            Activity::create([
                'user_id' => $user->id,
                'type' => 'milestone_verification_client_disputed',
                'entity_type' => MilestoneVerification::class,
                'entity_id' => $verification->id,
                'description' => "Client {$user->name} disputed milestone verification {$verification->verification_number}",
                'properties' => [
                    'verification_id' => $verification->id,
                    'verification_number' => $verification->verification_number,
                    'reason' => $reason,
                ],
            ]);

            return $verification->fresh([
                'milestone',
                'project',
                'unit',
                'paymentReleases',
                'progressPhotos',
            ]);
        });
    }

    /**
     * Upload a new Progress Photo linked to a milestone verification.
     */
    public function uploadProgressPhoto(string $verificationUuid, array $data, User $user): MilestoneProgressPhoto
    {
        $verification = MilestoneVerification::where('uuid', $verificationUuid)->firstOrFail();

        return MilestoneProgressPhoto::create([
            'milestone_verification_id' => $verification->id,
            'milestone_id' => $verification->milestone_id,
            'project_id' => $verification->project_id,
            'site_id' => $verification->site_id,
            'unit_id' => $verification->unit_id,
            'title' => $data['title'],
            'caption' => $data['caption'] ?? null,
            'photo_url' => $data['photo_url'],
            'thumbnail_url' => $data['thumbnail_url'] ?? $data['photo_url'],
            'photo_stage' => $data['photo_stage'] ?? 'during_construction',
            'captured_at' => !empty($data['captured_at']) ? $data['captured_at'] : now(),
            'gps_latitude' => $data['gps_latitude'] ?? null,
            'gps_longitude' => $data['gps_longitude'] ?? null,
            'gps_accuracy' => $data['gps_accuracy'] ?? null,
            'camera_make_model' => $data['camera_make_model'] ?? null,
            'uploaded_by' => $user->id,
            'is_client_visible' => $data['is_client_visible'] ?? true,
            'is_featured' => $data['is_featured'] ?? false,
        ]);
    }

    /**
     * Client flags a specific photo with snag notes.
     */
    public function flagPhoto(string $photoUuid, User $user, string $notes): MilestoneProgressPhoto
    {
        $photo = MilestoneProgressPhoto::where('uuid', $photoUuid)->firstOrFail();

        $photo->update([
            'client_flagged' => true,
            'client_flag_notes' => $notes,
            'client_flagged_at' => now(),
            'client_flagged_by' => $user->id,
        ]);

        return $photo;
    }

    /**
     * Summary statistics for client milestone portal dashboard.
     */
    public function getClientSummary(?Client $client): array
    {
        if (!$client) {
            return [
                'active_units_count' => 0,
                'total_verifications_count' => 0,
                'approved_verifications_count' => 0,
                'pending_approval_count' => 0,
                'total_escrow_authorized' => 0.00,
                'total_retention_held' => 0.00,
                'overall_completion_avg' => 0.0,
            ];
        }

        $unitIds = Unit::where('client_id', $client->id)
            ->orWhere('client_id', $client->user_id)
            ->pluck('id')
            ->toArray();

        $verificationsQuery = MilestoneVerification::where(function (Builder $q) use ($client, $unitIds) {
            $q->where('client_id', $client->id);
            if (!empty($unitIds)) {
                $q->orWhereIn('unit_id', $unitIds);
            }
        });

        $totalVerifications = (clone $verificationsQuery)->count();
        $approvedVerifications = (clone $verificationsQuery)->where('client_approval_status', 'approved')->count();
        $pendingApproval = (clone $verificationsQuery)
            ->where('client_approval_status', 'pending')
            ->where('stage', 'qs_verified')
            ->count();

        $avgCompletion = (clone $verificationsQuery)->avg('physical_completion_percentage') ?? 0;

        // Payment release aggregates
        $verificationIds = (clone $verificationsQuery)->pluck('id')->toArray();
        $releases = MilestonePaymentRelease::whereIn('milestone_verification_id', $verificationIds)->get();

        $totalEscrowAuthorized = $releases->whereIn('status', ['authorized', 'disbursed'])->sum('net_release_amount');
        $totalRetentionHeld = $releases->where('status', 'disbursed')->whereNull('retention_released_at')->sum('retention_amount');

        return [
            'active_units_count' => count($unitIds),
            'total_verifications_count' => $totalVerifications,
            'approved_verifications_count' => $approvedVerifications,
            'pending_approval_count' => $pendingApproval,
            'total_escrow_authorized' => round(floatval($totalEscrowAuthorized), 2),
            'total_retention_held' => round(floatval($totalRetentionHeld), 2),
            'overall_completion_avg' => round(floatval($avgCompletion), 1),
        ];
    }
}
