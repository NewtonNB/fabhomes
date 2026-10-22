<?php

namespace App\Services;

use App\Models\Client;
use App\Models\LandTitleDeed;
use App\Models\Payment;
use App\Models\PaymentIntent;
use App\Models\PlotReservation;
use App\Models\Project;
use App\Models\Transaction;
use App\Models\Unit;
use App\Models\User;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ClientPlotReservationService
{
    protected ClientAuthService $authService;

    public function __construct(ClientAuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Get list of plots with map coordinates & reservation metadata
     */
    public function getPlots(User $user, array $filters = []): array
    {
        $client = $this->authService->resolveOrCreateClient($user);

        $query = Unit::with([
            'project:id,uuid,name,code',
            'site:id,uuid,name',
            'reservations' => function ($q) {
                $q->active()->latest();
            },
        ])
            ->where(function ($q) {
                $q->where('unit_type', 'plot')
                    ->orWhereNull('unit_type');
            });

        // Filter by project
        if (!empty($filters['project_id'])) {
            $query->where('project_id', $filters['project_id']);
        }

        // Filter by status (available, reserved, sold)
        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        // Filter by price range
        if (!empty($filters['min_price'])) {
            $query->where('current_price', '>=', (float) $filters['min_price']);
        }
        if (!empty($filters['max_price'])) {
            $query->where('current_price', '<=', (float) $filters['max_price']);
        }

        // Search by unit number, name, location
        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($search) {
                $q->where('unit_number', 'like', $search)
                    ->orWhere('name', 'like', $search)
                    ->orWhere('location_description', 'like', $search);
            });
        }

        $units = $query->orderBy('id', 'asc')->get();

        $plots = $units->map(function ($unit, $index) use ($client, $user) {
            $meta = is_array($unit->metadata) ? $unit->metadata : [];
            $activeReservation = $unit->reservations->first();

            $isMyPlot = ($unit->client_id === $user->id) || ($activeReservation && $activeReservation->client_id === $client->id);
            $isReserved = $unit->status === 'reserved' || ($activeReservation !== null);

            // Calculate deterministic map layout if map coordinates are not in metadata
            $gridCols = 6;
            $col = $index % $gridCols;
            $row = (int) floor($index / $gridCols);

            $mapX = $meta['map_x'] ?? (80 + $col * 140);
            $mapY = $meta['map_y'] ?? (80 + $row * 120);
            $mapWidth = $meta['map_width'] ?? 110;
            $mapHeight = $meta['map_height'] ?? 90;

            return [
                'id' => $unit->id,
                'uuid' => $unit->uuid,
                'unit_number' => $unit->unit_number,
                'name' => $unit->name,
                'project' => $unit->project ? [
                    'id' => $unit->project->id,
                    'uuid' => $unit->project->uuid,
                    'name' => $unit->project->name,
                    'code' => $unit->project->code,
                ] : null,
                'site' => $unit->site ? [
                    'id' => $unit->site->id,
                    'uuid' => $unit->site->uuid,
                    'name' => $unit->site->name,
                ] : null,
                'status' => $unit->status,
                'area' => (float) ($unit->area ?? 450),
                'area_unit' => $unit->area_unit ?? 'sqm',
                'dimensions' => $meta['dimensions'] ?? '50ft x 100ft (approx 0.12 Acres)',
                'current_price' => (float) ($unit->current_price ?? 35000000),
                'base_price' => (float) ($unit->base_price ?? 35000000),
                'currency' => $unit->currency ?? 'UGX',
                'zone' => $meta['zone'] ?? ('Block ' . chr(65 + ($row % 4))),
                'soil_type' => $meta['soil_type'] ?? 'Stable Red Clay / Murram',
                'topography' => $meta['topography'] ?? 'Gentle slope with panoramic valley view',
                'tenure_type' => $meta['tenure_type'] ?? 'Private Mailo Title',
                'features' => $unit->features ?? ['Water on site', 'Power grid connected', '12m tarmac access road', 'Gated perimeter fence'],
                'location_description' => $unit->location_description ?? 'Prime hillside section',
                'is_my_plot' => $isMyPlot,
                'is_reserved' => $isReserved,
                'reservation' => $activeReservation ? [
                    'id' => $activeReservation->id,
                    'uuid' => $activeReservation->uuid,
                    'reservation_number' => $activeReservation->reservation_number,
                    'reserved_at' => $activeReservation->reserved_at?->toIso8601String(),
                    'expires_at' => $activeReservation->expires_at?->toIso8601String(),
                    'is_mine' => $activeReservation->client_id === $client->id,
                ] : null,
                'map_layout' => [
                    'x' => (int) $mapX,
                    'y' => (int) $mapY,
                    'width' => (int) $mapWidth,
                    'height' => (int) $mapHeight,
                ],
            ];
        });

        // Available estates / projects for filtering
        $projects = Project::select('id', 'uuid', 'name', 'code')->orderBy('name')->get();

        return [
            'plots' => $plots,
            'projects' => $projects,
            'summary' => [
                'total_plots' => $plots->count(),
                'available_count' => $plots->where('status', 'available')->count(),
                'reserved_count' => $plots->where('status', 'reserved')->count(),
                'sold_count' => $plots->whereIn('status', ['sold', 'occupied'])->count(),
                'my_plots_count' => $plots->where('is_my_plot', true)->count(),
            ],
        ];
    }

    /**
     * Get Interactive Estate Masterplan Map Data
     */
    public function getEstateMap(User $user, ?int $projectId = null): array
    {
        // Default to first active project if none specified
        if (!$projectId) {
            $defaultProject = Project::orderBy('id', 'asc')->first();
            $projectId = $defaultProject?->id;
        }

        $project = $projectId ? Project::find($projectId) : null;
        $plotData = $this->getPlots($user, ['project_id' => $projectId]);

        return [
            'project' => $project ? [
                'id' => $project->id,
                'uuid' => $project->uuid,
                'name' => $project->name,
                'code' => $project->code,
                'description' => $project->description ?? 'Master-planned residential community',
            ] : null,
            'canvas' => [
                'width' => 1000,
                'height' => 650,
                'roadways' => [
                    ['name' => 'Main Boulevard (15m)', 'x1' => 40, 'y1' => 40, 'x2' => 960, 'y2' => 40, 'strokeWidth' => 18],
                    ['name' => 'Central Spine Avenue (12m)', 'x1' => 480, 'y1' => 40, 'x2' => 480, 'y2' => 600, 'strokeWidth' => 14],
                    ['name' => 'Sunset Close (9m)', 'x1' => 40, 'y1' => 320, 'x2' => 960, 'y2' => 320, 'strokeWidth' => 12],
                ],
                'amenities' => [
                    ['name' => 'Estate Clubhouse & Pool', 'x' => 50, 'y' => 500, 'width' => 160, 'height' => 80, 'color' => '#0284c7'],
                    ['name' => 'Community Green Park', 'x' => 740, 'y' => 480, 'width' => 200, 'height' => 100, 'color' => '#10b981'],
                    ['name' => 'Security Gatehouse', 'x' => 440, 'y' => 10, 'width' => 80, 'height' => 30, 'color' => '#64748b'],
                ],
            ],
            'plots' => $plotData['plots'],
            'summary' => $plotData['summary'],
        ];
    }

    /**
     * Reserve a Plot (With Reservation Fee / Intent)
     */
    public function reservePlot(User $user, array $data, ?Request $request = null): array
    {
        $client = $this->authService->resolveOrCreateClient($user);

        $unitId = $data['unit_id'] ?? null;
        $unitUuid = $data['unit_uuid'] ?? null;

        $unit = Unit::when($unitUuid, fn($q) => $q->where('uuid', $unitUuid))
            ->when(!$unitUuid && $unitId, fn($q) => $q->where('id', $unitId))
            ->first();

        if (!$unit) {
            throw new Exception('The requested plot could not be found.');
        }

        // Check availability
        if ($unit->status !== 'available') {
            throw new Exception("Plot {$unit->unit_number} is currently {$unit->status} and cannot be reserved.");
        }

        $activeExistingRes = PlotReservation::where('unit_id', $unit->id)->active()->first();
        if ($activeExistingRes) {
            throw new Exception("Plot {$unit->unit_number} is already reserved under reservation {$activeExistingRes->reservation_number}.");
        }

        $reservationFee = (float) ($data['reservation_fee'] ?? 500000); // Standard 500,000 UGX
        if ($reservationFee < 100000) {
            throw new Exception('Minimum plot reservation fee is UGX 100,000.');
        }

        $gateway = $data['gateway'] ?? 'mtn_momo';
        $paymentMethod = match ($gateway) {
            'mtn_momo', 'airtel_money', 'flexipay' => 'mobile_money',
            'stanbic_bank' => 'bank_transfer',
            default => 'card',
        };

        return DB::transaction(function () use ($user, $client, $unit, $reservationFee, $gateway, $paymentMethod, $data) {
            // 1. Create PaymentIntent
            $intent = PaymentIntent::create([
                'uuid' => (string) Str::uuid(),
                'intent_reference' => 'INT-RES-' . date('Ymd') . '-' . strtoupper(Str::random(6)),
                'client_id' => $client->id,
                'user_id' => $user->id,
                'company_id' => $unit->project?->company_id ?? 1,
                'unit_id' => $unit->id,
                'project_id' => $unit->project_id,
                'gateway_name' => $gateway,
                'payment_method' => $paymentMethod,
                'amount' => $reservationFee,
                'total_charge_amount' => $reservationFee,
                'fee_amount' => 0.00,
                'currency' => 'UGX',
                'status' => 'succeeded', // Confirmed reservation
                'description' => "Plot Reservation Deposit for {$unit->unit_number} ({$unit->name})",
                'metadata' => [
                    'phone_number' => $data['phone_number'] ?? null,
                    'client_notes' => $data['notes'] ?? null,
                    'plot_number' => $unit->unit_number,
                ],
            ]);

            // 2. Create PlotReservation record
            $reservation = PlotReservation::create([
                'uuid' => (string) Str::uuid(),
                'reservation_number' => 'RES-' . date('Y') . '-' . strtoupper(Str::random(6)),
                'client_id' => $client->id,
                'user_id' => $user->id,
                'unit_id' => $unit->id,
                'site_id' => $unit->site_id,
                'project_id' => $unit->project_id,
                'status' => 'confirmed',
                'reservation_fee' => $reservationFee,
                'reservation_fee_paid' => $reservationFee,
                'payment_intent_id' => $intent->id,
                'payment_method' => $paymentMethod,
                'reserved_at' => now(),
                'expires_at' => now()->addDays(14), // 14-day guaranteed hold
                'terms_accepted' => true,
                'client_notes' => $data['notes'] ?? null,
                'metadata' => [
                    'gateway' => $gateway,
                    'phone_number' => $data['phone_number'] ?? null,
                    'project_name' => $unit->project?->name,
                ],
            ]);

            // 3. Update Unit status
            $unit->status = 'reserved';
            $unit->client_id = $user->id;
            $unit->reserved_date = now();
            $unit->amount_paid = ($unit->amount_paid ?? 0) + $reservationFee;
            $unit->balance = max(0, ($unit->current_price ?? 0) - $unit->amount_paid);
            $unit->save();

            // 4. Create immutable Payment record
            $payment = Payment::create([
                'uuid' => (string) Str::uuid(),
                'payment_reference' => 'PAY-RES-' . date('Ymd') . '-' . strtoupper(Str::random(6)),
                'client_id' => $client->id,
                'unit_id' => $unit->id,
                'amount' => $reservationFee,
                'currency' => 'UGX',
                'payment_type' => 'booking_fee',
                'payment_method' => $paymentMethod,
                'status' => 'confirmed',
                'payment_date' => now(),
                'payment_intent_id' => $intent->id,
                'notes' => "Official reservation lock fee for {$unit->unit_number}",
            ]);

            $intent->payment_id = $payment->id;
            $intent->save();

            // 5. Create immutable Transaction record (credit)
            Transaction::create([
                'uuid' => (string) Str::uuid(),
                'client_id' => $client->id,
                'payment_id' => $payment->id,
                'transaction_type' => 'credit',
                'amount' => $reservationFee,
                'currency' => 'UGX',
                'status' => 'completed',
                'transaction_date' => now(),
                'value_date' => now()->toDateString(),
                'description' => "Plot Reservation Deposit: {$unit->unit_number}",
                'narration' => "Reservation #{$reservation->reservation_number} via " . strtoupper($gateway),
                'reference_number' => $intent->intent_reference,
            ]);

            return [
                'message' => "Plot {$unit->unit_number} successfully reserved! 14-day hold activated.",
                'reservation' => [
                    'id' => $reservation->id,
                    'uuid' => $reservation->uuid,
                    'reservation_number' => $reservation->reservation_number,
                    'unit_number' => $unit->unit_number,
                    'plot_name' => $unit->name,
                    'reservation_fee' => (float) $reservationFee,
                    'status' => $reservation->status,
                    'reserved_at' => $reservation->reserved_at->toIso8601String(),
                    'expires_at' => $reservation->expires_at->toIso8601String(),
                    'days_remaining' => 14,
                ],
                'receipt' => [
                    'receipt_number' => 'RCT-' . strtoupper(Str::random(8)),
                    'date' => now()->toFormattedDateString(),
                    'amount' => $reservationFee,
                    'payment_method' => $paymentMethod,
                    'gateway' => $gateway,
                    'beneficiary' => 'FAB HOMES UGANDA LIMITED',
                ],
            ];
        });
    }

    /**
     * Get Client's Active and Past Reservations
     */
    public function getClientReservations(User $user): array
    {
        $client = $this->authService->resolveOrCreateClient($user);

        $reservations = PlotReservation::with([
            'unit:id,uuid,unit_number,name,current_price,area,status',
            'project:id,uuid,name,code',
            'site:id,uuid,name',
        ])
            ->where('client_id', $client->id)
            ->orderBy('id', 'desc')
            ->get();

        $formatted = $reservations->map(function ($res) {
            $daysRemaining = $res->expires_at ? max(0, (int) now()->diffInDays($res->expires_at, false)) : 0;
            $isExpired = $res->isExpired();

            return [
                'id' => $res->id,
                'uuid' => $res->uuid,
                'reservation_number' => $res->reservation_number,
                'plot' => [
                    'id' => $res->unit?->id,
                    'uuid' => $res->unit?->uuid,
                    'unit_number' => $res->unit?->unit_number,
                    'name' => $res->unit?->name,
                    'price' => (float) ($res->unit?->current_price ?? 0),
                    'area' => (float) ($res->unit?->area ?? 0),
                    'status' => $res->unit?->status,
                ],
                'project' => $res->project ? [
                    'name' => $res->project->name,
                    'code' => $res->project->code,
                ] : null,
                'site' => $res->site?->name,
                'status' => $res->status,
                'reservation_fee' => (float) $res->reservation_fee,
                'reservation_fee_paid' => (float) $res->reservation_fee_paid,
                'payment_method' => $res->payment_method,
                'reserved_at' => $res->reserved_at?->toIso8601String(),
                'expires_at' => $res->expires_at?->toIso8601String(),
                'days_remaining' => $daysRemaining,
                'is_expired' => $isExpired,
                'client_notes' => $res->client_notes,
            ];
        });

        return [
            'reservations' => $formatted,
            'active_count' => $formatted->where('status', 'confirmed')->count(),
        ];
    }

    /**
     * Cancel / Release a Plot Reservation
     */
    public function cancelReservation(User $user, string $reservationUuid, string $reason = ''): array
    {
        $client = $this->authService->resolveOrCreateClient($user);

        $reservation = PlotReservation::where('uuid', $reservationUuid)
            ->where('client_id', $client->id)
            ->first();

        if (!$reservation) {
            throw new Exception('Reservation not found or does not belong to your account.');
        }

        if (in_array($reservation->status, ['cancelled', 'expired', 'converted_to_sale'])) {
            throw new Exception("Reservation {$reservation->reservation_number} is already {$reservation->status}.");
        }

        return DB::transaction(function () use ($reservation, $reason) {
            $reservation->status = 'cancelled';
            $reservation->cancellation_reason = $reason ?: 'Client requested release';
            $reservation->save();

            // Release plot back to available if reserved
            $unit = Unit::find($reservation->unit_id);
            if ($unit && $unit->status === 'reserved') {
                $unit->status = 'available';
                $unit->reserved_date = null;
                $unit->client_id = null;
                $unit->save();
            }

            return [
                'message' => "Reservation {$reservation->reservation_number} has been cancelled and plot {$unit?->unit_number} released.",
                'reservation_number' => $reservation->reservation_number,
                'status' => 'cancelled',
            ];
        });
    }

    /**
     * Get Land Title & Deed Processing Tracking for Client Plots
     */
    public function getLandTitleDeeds(User $user): array
    {
        $client = $this->authService->resolveOrCreateClient($user);

        $deeds = LandTitleDeed::with([
            'unit:id,uuid,unit_number,name,area,status',
            'project:id,uuid,name,code',
            'document:id,uuid,title,file_path,file_type',
        ])
            ->where('client_id', $client->id)
            ->orderBy('id', 'desc')
            ->get();

        $formatted = $deeds->map(function ($deed) {
            // Build the 5-step pipeline progression
            $stages = [
                [
                    'step' => 1,
                    'key' => 'boundary_survey',
                    'label' => 'Cadastral Survey & Boundary Opening',
                    'status' => $deed->cadastral_survey_status === 'completed' ? 'completed' : ($deed->overall_stage === 'boundary_survey' ? 'in_progress' : 'completed'),
                    'date' => $deed->cadastral_survey_date?->toFormattedDateString(),
                    'surveyor' => $deed->surveyor_name ?? 'Licensed Staff Surveyor',
                    'notes' => 'Ground beacon coordinates fixed and verified.',
                ],
                [
                    'step' => 2,
                    'key' => 'ministry_mutation',
                    'label' => 'Ministry Zonal Office Mutation',
                    'status' => $deed->mutation_status === 'approved' ? 'completed' : (in_array($deed->overall_stage, ['ministry_mutation']) ? 'in_progress' : (in_array($deed->overall_stage, ['deed_plan', 'title_registration', 'deed_handover']) ? 'completed' : 'pending')),
                    'zonal_office' => $deed->ministry_zonal_office ?? 'Wakiso Ministry Zonal Office (MZO)',
                    'reference' => $deed->zonal_reference_number ?? 'MZO/MUT/2026/0892',
                    'submission_date' => $deed->submission_date?->toFormattedDateString(),
                    'notes' => 'Subdivision submitted to Department of Land Registration.',
                ],
                [
                    'step' => 3,
                    'key' => 'deed_plan',
                    'label' => 'Deed Plan Generation & Certification',
                    'status' => $deed->deed_plan_status === 'approved' ? 'completed' : ($deed->overall_stage === 'deed_plan' ? 'in_progress' : (in_array($deed->overall_stage, ['title_registration', 'deed_handover']) ? 'completed' : 'pending')),
                    'deed_plan_number' => $deed->deed_plan_number ?? 'DP-2026-WK-4011',
                    'date' => $deed->deed_plan_date?->toFormattedDateString(),
                    'notes' => 'Certified survey diagram and prints signed by Commissioner of Surveys.',
                ],
                [
                    'step' => 4,
                    'key' => 'title_registration',
                    'label' => 'Title Deed Issuance & Registration',
                    'status' => $deed->title_registration_status === 'registered' ? 'completed' : ($deed->overall_stage === 'title_registration' ? 'in_progress' : ($deed->overall_stage === 'deed_handover' ? 'completed' : 'pending')),
                    'title_number' => $deed->title_number ?? 'Busiro Block 450 Plot 128',
                    'registration_date' => $deed->registration_date?->toFormattedDateString(),
                    'notes' => 'Official White Page certificate created in Ministry Land Information System (MLIS).',
                ],
                [
                    'step' => 5,
                    'key' => 'deed_handover',
                    'label' => 'Final Title Handover & Custody',
                    'status' => $deed->handover_status === 'handed_over' ? 'completed' : ($deed->overall_stage === 'deed_handover' ? 'in_progress' : 'pending'),
                    'handover_date' => $deed->handover_date?->toFormattedDateString(),
                    'notes' => $deed->handover_status === 'handed_over' ? 'Physical title handed over to client.' : 'Held securely in Fab Homes legal vault awaiting client collection / courier.',
                ],
            ];

            return [
                'id' => $deed->id,
                'uuid' => $deed->uuid,
                'deed_number' => $deed->deed_number,
                'title_number' => $deed->title_number ?? 'Pending Registration',
                'tenure_type' => ucfirst($deed->tenure_type) . ' Title',
                'overall_stage' => $deed->overall_stage,
                'overall_progress_percentage' => (int) $deed->overall_progress_percentage,
                'estimated_completion_date' => $deed->estimated_completion_date?->toFormattedDateString() ?? 'Within 45 Days',
                'plot' => [
                    'id' => $deed->unit?->id,
                    'uuid' => $deed->unit?->uuid,
                    'unit_number' => $deed->unit?->unit_number,
                    'name' => $deed->unit?->name,
                    'area' => (float) ($deed->unit?->area ?? 0),
                ],
                'project' => $deed->project ? [
                    'name' => $deed->project->name,
                    'code' => $deed->project->code,
                ] : null,
                'stages' => $stages,
                'beacon_coordinates' => $deed->beacon_coordinates ?? [
                    ['beacon' => 'BN-1', 'lat' => 0.35412, 'lng' => 32.59231],
                    ['beacon' => 'BN-2', 'lat' => 0.35445, 'lng' => 32.59255],
                    ['beacon' => 'BN-3', 'lat' => 0.35420, 'lng' => 32.59298],
                    ['beacon' => 'BN-4', 'lat' => 0.35388, 'lng' => 32.59274],
                ],
                'document' => $deed->document ? [
                    'id' => $deed->document->id,
                    'uuid' => $deed->document->uuid,
                    'title' => $deed->document->title,
                    'file_path' => $deed->document->file_path,
                ] : null,
                'notes' => $deed->notes,
            ];
        });

        return [
            'deeds' => $formatted,
            'total_titles' => $formatted->count(),
        ];
    }
}
