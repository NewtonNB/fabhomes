<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\ConstructionMilestone;
use App\Models\MilestoneSavingsPool;
use App\Models\OfflineSyncLog;
use App\Models\Project;
use App\Models\PunchListItem;
use App\Models\Site;
use App\Models\SiteInspection;
use App\Models\SubcontractorContract;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class SiteAuditSyncService
{
    /**
     * Standard Quality Assurance Checklist Templates by Inspection Type
     */
    public const CHECKLIST_TEMPLATES = [
        'foundation' => [
            [
                'id' => 'fnd_01',
                'title' => 'Excavation & Trench Depth',
                'description' => 'Trench depth and footing width verified to structural engineering drawings.',
                'critical' => true,
            ],
            [
                'id' => 'fnd_02',
                'title' => 'Soil Bearing & Blinding Concrete',
                'description' => 'Soil bearing capacity confirmed and 50mm plain concrete blinding layer poured.',
                'critical' => true,
            ],
            [
                'id' => 'fnd_03',
                'title' => 'Steel Rebar Placement & Spacing',
                'description' => 'Foundation rebar cage sizing (Y12/Y16), cover spacers, and starter bar heights compliant.',
                'critical' => true,
            ],
            [
                'id' => 'fnd_04',
                'title' => 'Concrete Slump & Cube Sampling',
                'description' => 'Concrete slump test (75-100mm) verified; 3 test cubes cast for 7/28-day compression test.',
                'critical' => true,
            ],
            [
                'id' => 'fnd_05',
                'title' => 'DPM & Anti-Termite Treatment',
                'description' => 'Heavy-duty 1000-gauge DPM membrane laid with 300mm laps; chemical termite barrier applied.',
                'critical' => false,
            ],
        ],
        'structural_framing' => [
            [
                'id' => 'str_01',
                'title' => 'RC Column Verticality & Plumb',
                'description' => 'Column shuttering vertical alignment checked with plumb line (tolerance < 3mm).',
                'critical' => true,
            ],
            [
                'id' => 'str_02',
                'title' => 'Ring Beam Rebar & Anchorage',
                'description' => 'Ring beam main longitudinal bars (4Y12) and R8 stirrup spacing (150mm c/c) verified.',
                'critical' => true,
            ],
            [
                'id' => 'str_03',
                'title' => 'Lintel Casting & Bearing Length',
                'description' => 'Precast or in-situ lintels over openings have minimum 200mm bearing on both sides.',
                'critical' => true,
            ],
            [
                'id' => 'str_04',
                'title' => 'Masonry Mortar Mix & Joint Thickness',
                'description' => 'Cement-sand mix ratio (1:4) verified; horizontal bedding joints uniform at 10-12mm.',
                'critical' => false,
            ],
        ],
        'roofing' => [
            [
                'id' => 'ruf_01',
                'title' => 'Wall Plate Anchoring & Strapping',
                'description' => 'Wall plates anchored to RC ring beam with hoop iron ties at 900mm centers.',
                'critical' => true,
            ],
            [
                'id' => 'ruf_02',
                'title' => 'Treated Timber Truss Rigidity & Bracing',
                'description' => 'Pressure-treated cypress/eucalyptus trusses braced diagonally and anti-rot sealed.',
                'critical' => true,
            ],
            [
                'id' => 'ruf_03',
                'title' => 'Valley Gutters & Flashing Watertightness',
                'description' => 'G28 galvanized steel valley gutters and roof-wall step flashings watertight.',
                'critical' => true,
            ],
            [
                'id' => 'ruf_04',
                'title' => 'Roofing Sheets Overlap & Fasteners',
                'description' => 'Pre-painted roofing sheets fixed with neo-washer self-drilling screws on crests.',
                'critical' => false,
            ],
        ],
        'plumbing_rough_in' => [
            [
                'id' => 'plm_01',
                'title' => 'PPR Water Pipe Hydraulic Pressure Test',
                'description' => 'Cold & hot water lines pressurized to 10 bar for 2 hours with zero pressure drop.',
                'critical' => true,
            ],
            [
                'id' => 'plm_02',
                'title' => 'PVC Waste Drainage Invert Slopes',
                'description' => '110mm soil and 50mm waste lines sloped at minimum 1:50 gradient without backfall.',
                'critical' => true,
            ],
            [
                'id' => 'plm_03',
                'title' => 'Vent Stack Pipe Roof Terminations',
                'description' => 'Vent pipes extended minimum 450mm above roof line with insect-proof cowl hoods.',
                'critical' => false,
            ],
        ],
        'electrical_rough_in' => [
            [
                'id' => 'ele_01',
                'title' => 'PVC Conduit Wall Chasing Depths',
                'description' => 'Conduit runs chased into blockwork with at least 15mm plaster cover depth.',
                'critical' => false,
            ],
            [
                'id' => 'ele_02',
                'title' => 'Main Distribution Board Earth Resistance',
                'description' => 'Copper earth rod driven to subsoil; earth resistance measured below 5 ohms.',
                'critical' => true,
            ],
            [
                'id' => 'ele_03',
                'title' => 'Cable Loop Insulation & Color Coding',
                'description' => 'Single-core copper cables (1.5mm lighting, 2.5mm sockets, 6mm cookers) color-coded.',
                'critical' => true,
            ],
        ],
        'finishing' => [
            [
                'id' => 'fin_01',
                'title' => 'Wall Plaster Smoothness & Straight Edges',
                'description' => 'Plastered walls plumb, square at 90-degree internal angles, free from hollow patches.',
                'critical' => false,
            ],
            [
                'id' => 'fin_02',
                'title' => 'Floor Tile Bedding & Grout Lines',
                'description' => 'Vitrified porcelain tiles 100% bedded with C2 adhesive; 2mm grout lines uniform.',
                'critical' => false,
            ],
            [
                'id' => 'fin_03',
                'title' => 'Window Glazing & Perimeter Mastic Seal',
                'description' => 'Aluminum sliding windows weather-stripped; external perimeter sealed with neutral silicone.',
                'critical' => true,
            ],
        ],
        'handover_audit' => [
            [
                'id' => 'hnd_01',
                'title' => 'Locksets, Keys & Door Clearances',
                'description' => 'All internal and external doors swing freely; master keys and cylinders verified.',
                'critical' => true,
            ],
            [
                'id' => 'hnd_02',
                'title' => 'Sanitaryware Fittings & Drainage Flushing',
                'description' => 'All WCs, washbasins, and shower mixers tested under full mains pressure.',
                'critical' => true,
            ],
            [
                'id' => 'hnd_03',
                'title' => 'Electrical Circuit & Socket Polarity Test',
                'description' => 'Every 13A socket outlet tested with digital polarity checker; RCD tripping functional.',
                'critical' => true,
            ],
            [
                'id' => 'hnd_04',
                'title' => 'Final Cleaning & Paint Touch-Ups',
                'description' => 'Premises broom-clean; walls free from scuffs, paint splatters, or glass blemishes.',
                'critical' => false,
            ],
        ],
    ];

    /**
     * Generate comprehensive offline cache package for field engineer devices
     */
    public function getOfflineCachePackage(?int $projectId = null, ?int $siteId = null, ?User $user = null): array
    {
        $sitesQuery = Site::query();
        if ($siteId) {
            $sitesQuery->where('id', $siteId);
        }
        $sites = $sitesQuery->select(['id', 'uuid', 'name', 'code', 'address', 'city', 'latitude', 'longitude', 'status'])->get();

        $projectsQuery = Project::query()->whereIn('status', ['in_progress', 'planning', 'active']);
        if ($projectId) {
            $projectsQuery->where('id', $projectId);
        } elseif ($siteId) {
            $projectsQuery->where('site_id', $siteId);
        }
        $projects = $projectsQuery->with([
            'milestones.savingsPool',
            'units:id,uuid,project_id,unit_number,status',
        ])->get();

        // Extract milestone pools related to these projects
        $projectIds = $projects->pluck('id');
        $milestonePools = MilestoneSavingsPool::whereIn('project_id', $projectIds)
            ->with('savingsAccount:id,uuid,account_number,client_id,current_balance')
            ->orderBy('tier_order')
            ->get();

        // Open punch list defects for field reference
        $openPunchItems = PunchListItem::whereIn('project_id', $projectIds)
            ->whereIn('status', ['open', 'in_progress'])
            ->select([
                'id',
                'uuid',
                'item_number',
                'project_id',
                'site_id',
                'title',
                'location_details',
                'category',
                'severity',
                'status',
            ])
            ->get();

        // Subcontractors
        $subcontractors = SubcontractorContract::whereIn('project_id', $projectIds)
            ->where('status', 'active')
            ->select(['id', 'contract_number', 'subcontractor_name', 'scope_of_work', 'trade_category'])
            ->get();

        return [
            'package_version' => '1.0.0',
            'generated_at' => now()->toIso8601String(),
            'user' => [
                'id' => $user?->id ?? auth()->id(),
                'name' => $user?->name ?? 'Field Engineer',
                'email' => $user?->email,
            ],
            'checklist_templates' => self::CHECKLIST_TEMPLATES,
            'sites' => $sites,
            'projects' => $projects,
            'milestone_pools' => $milestonePools,
            'open_punch_items' => $openPunchItems,
            'subcontractors' => $subcontractors,
            'gps_geo_fences' => [
                'kigo_hill' => ['name' => 'Kigo Hill Estate', 'lat' => 0.1983, 'lng' => 32.5852, 'radius_m' => 800],
                'lubowa_heights' => ['name' => 'Lubowa Heights', 'lat' => 0.2312, 'lng' => 32.5621, 'radius_m' => 600],
                'entebbe_breeze' => ['name' => 'Entebbe Lake View', 'lat' => 0.0521, 'lng' => 32.4632, 'radius_m' => 1000],
            ],
        ];
    }

    /**
     * Process batch of offline site inspections and punch list items
     */
    public function syncOfflineAudits(
        array $payload,
        User $user,
        ?string $deviceId = null,
        ?string $ipAddress = null
    ): array {
        return DB::transaction(function () use ($payload, $user, $deviceId, $ipAddress) {
            $deviceId = $deviceId ?? $payload['device_id'] ?? 'DEVICE-UNKNOWN';
            $inspectionsData = $payload['inspections'] ?? [];
            $punchItemsData = $payload['punch_list_items'] ?? [];

            $syncedInspections = [];
            $syncedPunchItems = [];
            $conflicts = [];

            // 1. Process Site Inspections
            foreach ($inspectionsData as $raw) {
                $clientSyncId = $raw['client_sync_id'] ?? ($raw['uuid'] ?? (string) Str::uuid());
                $uuid = $raw['uuid'] ?? (string) Str::uuid();

                // Check for existing record by client_sync_id or uuid
                $existing = SiteInspection::where('client_sync_id', $clientSyncId)
                    ->orWhere('uuid', $uuid)
                    ->first();

                $score = isset($raw['score']) ? (float) $raw['score'] : null;
                $verifiedPct = isset($raw['verified_milestone_percentage'])
                    ? (float) $raw['verified_milestone_percentage']
                    : (isset($raw['score']) ? (float) $raw['score'] : 0.00);

                if ($existing) {
                    // Conflict detection: If record was modified online AFTER offline creation
                    $offlineCreatedAt = !empty($raw['offline_created_at'])
                        ? Carbon::parse($raw['offline_created_at'])
                        : now();

                    if ($existing->updated_at && $existing->updated_at->greaterThan($offlineCreatedAt)) {
                        // Conflict detected - preserve online record but record details
                        $conflicts[] = [
                            'entity' => 'site_inspection',
                            'id' => $existing->id,
                            'client_sync_id' => $clientSyncId,
                            'reason' => 'Online record updated on ' . $existing->updated_at->toIso8601String() . ' which is newer than offline capture (' . $offlineCreatedAt->toIso8601String() . ')',
                            'server_data' => $existing->toArray(),
                            'client_data' => $raw,
                        ];

                        $existing->update([
                            'sync_status' => 'conflict_resolved',
                            'synced_at' => now(),
                        ]);
                        $syncedInspections[] = $existing->fresh();
                        continue;
                    }

                    // No conflict or client is newer: Update existing
                    $existing->update([
                        'title' => $raw['title'] ?? $existing->title,
                        'status' => $raw['status'] ?? $existing->status,
                        'score' => $score ?? $existing->score,
                        'verified_milestone_percentage' => $verifiedPct,
                        'checklist_items' => $raw['checklist_items'] ?? $existing->checklist_items,
                        'summary_notes' => $raw['summary_notes'] ?? $existing->summary_notes,
                        'conditions' => $raw['conditions'] ?? $existing->conditions,
                        'gps_latitude' => $raw['gps_latitude'] ?? $existing->gps_latitude,
                        'gps_longitude' => $raw['gps_longitude'] ?? $existing->gps_longitude,
                        'gps_accuracy' => $raw['gps_accuracy'] ?? $existing->gps_accuracy,
                        'weather_condition' => $raw['weather_condition'] ?? $existing->weather_condition,
                        'work_authorized' => !empty($raw['work_authorized']),
                        'synced_at' => now(),
                        'sync_status' => 'synced',
                    ]);

                    $inspection = $existing->fresh();
                } else {
                    // Create new SiteInspection from offline capture
                    $inspection = SiteInspection::create([
                        'uuid' => $uuid,
                        'client_sync_id' => $clientSyncId,
                        'device_id' => $deviceId,
                        'offline_created_at' => !empty($raw['offline_created_at']) ? Carbon::parse($raw['offline_created_at']) : now(),
                        'synced_at' => now(),
                        'sync_status' => 'synced',
                        'title' => $raw['title'] ?? ('Site Walk-Through Inspection ' . now()->format('Y-m-d')),
                        'inspection_type' => $raw['inspection_type'] ?? 'other',
                        'site_id' => $raw['site_id'],
                        'project_id' => $raw['project_id'] ?? null,
                        'unit_id' => $raw['unit_id'] ?? null,
                        'milestone_id' => $raw['milestone_id'] ?? null,
                        'milestone_savings_pool_id' => $raw['milestone_savings_pool_id'] ?? null,
                        'inspector_id' => $user->id,
                        'scheduled_date' => !empty($raw['scheduled_date']) ? Carbon::parse($raw['scheduled_date'])->toDateString() : now()->toDateString(),
                        'inspected_at' => !empty($raw['inspected_at']) ? Carbon::parse($raw['inspected_at']) : now(),
                        'status' => $raw['status'] ?? 'passed',
                        'score' => $score,
                        'verified_milestone_percentage' => $verifiedPct,
                        'checklist_items' => $raw['checklist_items'] ?? [],
                        'summary_notes' => $raw['summary_notes'] ?? null,
                        'conditions' => $raw['conditions'] ?? null,
                        'gps_latitude' => $raw['gps_latitude'] ?? null,
                        'gps_longitude' => $raw['gps_longitude'] ?? null,
                        'gps_accuracy' => $raw['gps_accuracy'] ?? null,
                        'weather_condition' => $raw['weather_condition'] ?? 'sunny',
                        'work_authorized' => !empty($raw['work_authorized']),
                        'created_by' => $user->id,
                    ]);
                }

                // If linked to physical milestone or savings pool, sync physical progress
                if ($inspection->milestone_id) {
                    $milestone = ConstructionMilestone::find($inspection->milestone_id);
                    if ($milestone) {
                        if ($verifiedPct > (float) $milestone->completion_percentage) {
                            $milestone->completion_percentage = $verifiedPct;
                        }
                        if ($inspection->status === 'passed' && $verifiedPct >= 100.00 && $milestone->status !== 'completed') {
                            $milestone->status = 'completed';
                            $milestone->actual_end_date = now()->toDateString();
                        } elseif ($inspection->status === 'in_progress' && $milestone->status === 'pending') {
                            $milestone->status = 'in_progress';
                            if (!$milestone->actual_start_date) {
                                $milestone->actual_start_date = now()->toDateString();
                            }
                        }
                        $milestone->save();
                    }
                }

                // If linked to milestone savings pool, check readiness/completion
                if ($inspection->milestone_savings_pool_id) {
                    $pool = MilestoneSavingsPool::find($inspection->milestone_savings_pool_id);
                    if ($pool && $inspection->status === 'passed' && $verifiedPct >= 100.00) {
                        if ($pool->status === 'locked' && $pool->disbursed_amount >= $pool->target_amount) {
                            $pool->status = 'fully_disbursed';
                            $pool->completed_at = now();
                            $pool->save();
                        }
                    }
                }

                $syncedInspections[] = $inspection;
            }

            // 2. Process Punch List Defect Items
            foreach ($punchItemsData as $rawPunch) {
                $clientSyncId = $rawPunch['client_sync_id'] ?? ($rawPunch['uuid'] ?? (string) Str::uuid());
                $uuid = $rawPunch['uuid'] ?? (string) Str::uuid();

                // Resolve inspection id if client attached it via client_sync_id
                $parentInspectionId = $rawPunch['site_inspection_id'] ?? null;
                if (!$parentInspectionId && !empty($rawPunch['inspection_client_sync_id'])) {
                    $parent = SiteInspection::where('client_sync_id', $rawPunch['inspection_client_sync_id'])->first();
                    $parentInspectionId = $parent?->id;
                }

                $existingPunch = PunchListItem::where('client_sync_id', $clientSyncId)
                    ->orWhere('uuid', $uuid)
                    ->first();

                if ($existingPunch) {
                    $existingPunch->update([
                        'title' => $rawPunch['title'] ?? $existingPunch->title,
                        'description' => $rawPunch['description'] ?? $existingPunch->description,
                        'location_details' => $rawPunch['location_details'] ?? $existingPunch->location_details,
                        'category' => $rawPunch['category'] ?? $existingPunch->category,
                        'severity' => $rawPunch['severity'] ?? $existingPunch->severity,
                        'status' => $rawPunch['status'] ?? $existingPunch->status,
                        'photo_url' => $rawPunch['photo_url'] ?? $existingPunch->photo_url,
                        'synced_at' => now(),
                    ]);
                    $punchItem = $existingPunch->fresh();
                } else {
                    $punchItem = PunchListItem::create([
                        'uuid' => $uuid,
                        'client_sync_id' => $clientSyncId,
                        'offline_created_at' => !empty($rawPunch['offline_created_at']) ? Carbon::parse($rawPunch['offline_created_at']) : now(),
                        'synced_at' => now(),
                        'site_inspection_id' => $parentInspectionId,
                        'site_id' => $rawPunch['site_id'],
                        'project_id' => $rawPunch['project_id'] ?? null,
                        'unit_id' => $rawPunch['unit_id'] ?? null,
                        'title' => $rawPunch['title'],
                        'description' => $rawPunch['description'] ?? 'Logged via offline PWA walkthrough',
                        'photo_url' => $rawPunch['photo_url'] ?? null,
                        'location_details' => $rawPunch['location_details'] ?? null,
                        'gps_latitude' => $rawPunch['gps_latitude'] ?? null,
                        'gps_longitude' => $rawPunch['gps_longitude'] ?? null,
                        'category' => $rawPunch['category'] ?? 'finishing',
                        'severity' => $rawPunch['severity'] ?? 'medium',
                        'status' => $rawPunch['status'] ?? 'open',
                        'due_date' => !empty($rawPunch['due_date']) ? Carbon::parse($rawPunch['due_date'])->toDateString() : now()->addDays(7)->toDateString(),
                        'reported_by' => $user->id,
                    ]);
                }

                $syncedPunchItems[] = $punchItem;
            }

            // 3. Create Offline Sync Log entry
            $totalProcessed = count($syncedInspections) + count($syncedPunchItems);
            $totalConflicts = count($conflicts);
            $syncStatus = $totalConflicts > 0 ? 'partial_success' : 'success';

            $log = OfflineSyncLog::create([
                'device_id' => $deviceId,
                'user_id' => $user->id,
                'sync_type' => $payload['sync_type'] ?? 'walkthrough_audit_batch',
                'total_items_processed' => $totalProcessed,
                'total_conflicts' => $totalConflicts,
                'payload_summary' => [
                    'inspections_count' => count($syncedInspections),
                    'punch_items_count' => count($syncedPunchItems),
                    'conflicts_count' => $totalConflicts,
                ],
                'client_version' => $payload['client_version'] ?? '1.0.0',
                'ip_address' => $ipAddress,
                'status' => $syncStatus,
            ]);

            Activity::log(
                'offline_site_audit_synced',
                "Synchronized {$totalProcessed} offline audit items ({$totalConflicts} conflicts) from device {$deviceId}",
                $log,
                $user
            );

            return [
                'sync_id' => $log->uuid,
                'status' => $syncStatus,
                'total_processed' => $totalProcessed,
                'total_conflicts' => $totalConflicts,
                'synced_inspections' => $syncedInspections,
                'synced_punch_items' => $syncedPunchItems,
                'conflicts' => $conflicts,
                'server_time' => now()->toIso8601String(),
            ];
        });
    }

    /**
     * Get recent offline sync telemetry logs
     */
    public function getSyncLogs(int $limit = 25)
    {
        return OfflineSyncLog::with('user:id,name,email')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }
}
