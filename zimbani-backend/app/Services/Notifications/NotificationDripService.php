<?php

namespace App\Services\Notifications;

use App\Models\Client;
use App\Models\MilestoneVerification;
use App\Models\NotificationDripTrigger;
use App\Models\PlotReservation;
use App\Models\SavingsAccount;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NotificationDripService
{
    protected NotificationDispatcherService $dispatcher;

    public function __construct(?NotificationDispatcherService $dispatcher = null)
    {
        $this->dispatcher = $dispatcher ?? app(NotificationDispatcherService::class);
    }

    /**
     * Run all automated drip workflows or a specific target workflow.
     */
    public function runAllDrips(bool $dryRun = false, ?string $workflow = 'all'): array
    {
        $results = [
            'executed_at' => Carbon::now()->toIso8601String(),
            'dry_run' => $dryRun,
            'workflow' => $workflow,
            'summary' => [
                'total_evaluated' => 0,
                'total_triggered' => 0,
                'total_skipped' => 0,
                'total_errors' => 0,
            ],
            'breakdown' => [],
        ];

        $target = strtolower($workflow ?? 'all');

        if ($target === 'all' || $target === 'savings') {
            $results['breakdown']['savings'] = $this->processSavingsContributionReminders($dryRun);
        }

        if ($target === 'all' || $target === 'reservations') {
            $results['breakdown']['reservations'] = $this->processPlotReservationExpiryCountdown($dryRun);
        }

        if ($target === 'all' || $target === 'milestones') {
            $results['breakdown']['milestones'] = $this->processMilestoneInspectionNudges($dryRun);
        }

        if ($target === 'all' || $target === 'dormant') {
            $results['breakdown']['dormant'] = $this->processDormantClientReengagement($dryRun);
        }

        foreach ($results['breakdown'] as $campaign) {
            $results['summary']['total_evaluated'] += $campaign['evaluated'];
            $results['summary']['total_triggered'] += $campaign['triggered'];
            $results['summary']['total_skipped'] += $campaign['skipped'];
            $results['summary']['total_errors'] += $campaign['errors'];
        }

        return $results;
    }

    /**
     * Workflow 1: Savings Contribution Reminders
     */
    public function processSavingsContributionReminders(bool $dryRun = false): array
    {
        $stats = ['evaluated' => 0, 'triggered' => 0, 'skipped' => 0, 'errors' => 0, 'triggers' => []];

        $accounts = SavingsAccount::where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('closed_date')->orWhere('closed_date', '>', Carbon::now());
            })
            ->with(['client.user'])
            ->get();

        $currentMonthKey = Carbon::now()->format('Y_m');

        foreach ($accounts as $account) {
            $stats['evaluated']++;

            try {
                $triggerKey = "savings_remind_{$account->id}_{$currentMonthKey}";

                if (NotificationDripTrigger::where('trigger_key', $triggerKey)->exists()) {
                    $stats['skipped']++;
                    continue;
                }

                $user = $account->client?->user ?? User::find($account->client?->user_id);
                if (!$user) {
                    $stats['skipped']++;
                    continue;
                }

                $currency = $account->currency ?: 'UGX';
                $balanceFmt = number_format((float) $account->current_balance, 2);
                $title = "Monthly Target Savings Reminder: {$account->scheme_name} ({$account->account_number})";
                $message = "Hello {$account->client?->first_name}, your savings goal for {$account->scheme_name} is active! Current balance: {$currency} {$balanceFmt}. Keep up the steady contributions towards your dream home.";

                $attemptedChannels = ['in_app', 'email', 'sms', 'whatsapp'];
                $succeededChannels = [];
                $dispatchSummary = null;

                if (!$dryRun) {
                    $dispatchResult = $this->dispatcher->dispatchToUser($user, [
                        'type' => 'savings_deposit',
                        'title' => $title,
                        'message' => $message,
                        'category' => 'financial',
                        'priority' => 'normal',
                        'action_url' => '/portal/savings',
                        'data' => [
                            'account_id' => $account->id,
                            'account_number' => $account->account_number,
                            'balance' => (float) $account->current_balance,
                        ],
                    ]);

                    $dispatchSummary = $dispatchResult;
                    foreach ($dispatchResult['channels'] ?? [] as $ch => $info) {
                        if (($info['status'] ?? '') === 'sent' || ($info['status'] ?? '') === 'delivered') {
                            $succeededChannels[] = $ch;
                        }
                    }
                }

                $trigger = NotificationDripTrigger::create([
                    'campaign_type' => 'savings_reminder',
                    'trigger_key' => $triggerKey,
                    'recipient_user_id' => $user->id,
                    'recipient_client_id' => $account->client_id,
                    'entity_type' => SavingsAccount::class,
                    'entity_id' => $account->id,
                    'title' => $title,
                    'message' => $message,
                    'channels_attempted' => $attemptedChannels,
                    'channels_succeeded' => $dryRun ? [] : $succeededChannels,
                    'status' => $dryRun ? 'skipped' : 'dispatched',
                    'is_dry_run' => $dryRun,
                    'dispatch_summary' => $dispatchSummary,
                    'dispatched_at' => $dryRun ? null : Carbon::now(),
                    'metadata' => [
                        'account_number' => $account->account_number,
                        'current_balance' => (float) $account->current_balance,
                        'scheme_name' => $account->scheme_name,
                    ],
                ]);

                $stats['triggered']++;
                $stats['triggers'][] = [
                    'id' => $trigger->id,
                    'key' => $triggerKey,
                    'account_number' => $account->account_number,
                    'status' => $trigger->status,
                ];
            } catch (\Throwable $e) {
                Log::error("Savings drip error on account {$account->id}: " . $e->getMessage());
                $stats['errors']++;
            }
        }

        return $stats;
    }

    /**
     * Workflow 2: Plot Reservation Expiry Countdown
     */
    public function processPlotReservationExpiryCountdown(bool $dryRun = false): array
    {
        $stats = ['evaluated' => 0, 'triggered' => 0, 'skipped' => 0, 'errors' => 0, 'triggers' => []];

        $reservations = PlotReservation::whereIn('status', ['pending', 'confirmed'])
            ->whereNotNull('expires_at')
            ->where('expires_at', '>', Carbon::now())
            ->with(['client.user', 'user'])
            ->get();

        foreach ($reservations as $res) {
            $stats['evaluated']++;

            try {
                $now = Carbon::now();
                $hoursLeft = $now->diffInHours($res->expires_at, false);

                $thresholdKey = null;
                $timeLabel = '';

                if ($hoursLeft <= 24 && $hoursLeft > 0) {
                    $thresholdKey = '24h';
                    $timeLabel = 'less than 24 hours remaining';
                } elseif ($hoursLeft <= 72 && $hoursLeft > 24) {
                    $thresholdKey = '3d';
                    $timeLabel = '3 days remaining';
                } elseif ($hoursLeft <= 168 && $hoursLeft > 72) {
                    $thresholdKey = '7d';
                    $timeLabel = '7 days remaining';
                }

                if (!$thresholdKey) {
                    $stats['skipped']++;
                    continue;
                }

                $triggerKey = "plot_expiry_{$res->id}_{$thresholdKey}";

                if (NotificationDripTrigger::where('trigger_key', $triggerKey)->exists()) {
                    $stats['skipped']++;
                    continue;
                }

                $user = $res->user ?? $res->client?->user ?? User::find($res->user_id);
                if (!$user) {
                    $stats['skipped']++;
                    continue;
                }

                $title = "Urgent: Plot Reservation {$res->reservation_number} Expiring ({$timeLabel})";
                $message = "Your statutory plot reservation for Plot #{$res->unit_id} will expire in {$timeLabel}. Complete your reservation fee deposit now to secure your estate allocation before release.";

                $attemptedChannels = ['in_app', 'email', 'sms', 'whatsapp'];
                $succeededChannels = [];
                $dispatchSummary = null;

                if (!$dryRun) {
                    $dispatchResult = $this->dispatcher->dispatchToUser($user, [
                        'type' => 'plot_reservation',
                        'title' => $title,
                        'message' => $message,
                        'category' => 'legal',
                        'priority' => 'urgent',
                        'action_url' => '/portal/reservations',
                        'data' => [
                            'reservation_id' => $res->id,
                            'reservation_number' => $res->reservation_number,
                            'expires_at' => $res->expires_at->toIso8601String(),
                            'hours_left' => $hoursLeft,
                        ],
                    ]);

                    $dispatchSummary = $dispatchResult;
                    foreach ($dispatchResult['channels'] ?? [] as $ch => $info) {
                        if (($info['status'] ?? '') === 'sent' || ($info['status'] ?? '') === 'delivered') {
                            $succeededChannels[] = $ch;
                        }
                    }
                }

                $trigger = NotificationDripTrigger::create([
                    'campaign_type' => 'plot_expiry',
                    'trigger_key' => $triggerKey,
                    'recipient_user_id' => $user->id,
                    'recipient_client_id' => $res->client_id,
                    'entity_type' => PlotReservation::class,
                    'entity_id' => $res->id,
                    'title' => $title,
                    'message' => $message,
                    'channels_attempted' => $attemptedChannels,
                    'channels_succeeded' => $dryRun ? [] : $succeededChannels,
                    'status' => $dryRun ? 'skipped' : 'dispatched',
                    'is_dry_run' => $dryRun,
                    'dispatch_summary' => $dispatchSummary,
                    'dispatched_at' => $dryRun ? null : Carbon::now(),
                    'metadata' => [
                        'reservation_number' => $res->reservation_number,
                        'expires_at' => $res->expires_at->toIso8601String(),
                        'hours_left' => $hoursLeft,
                        'threshold' => $thresholdKey,
                    ],
                ]);

                $stats['triggered']++;
                $stats['triggers'][] = [
                    'id' => $trigger->id,
                    'key' => $triggerKey,
                    'reservation_number' => $res->reservation_number,
                    'threshold' => $thresholdKey,
                ];
            } catch (\Throwable $e) {
                Log::error("Plot expiry drip error on reservation {$res->id}: " . $e->getMessage());
                $stats['errors']++;
            }
        }

        return $stats;
    }

    /**
     * Workflow 3: Milestone Inspection Sign-Off Nudges (> 48 hours unapproved)
     */
    public function processMilestoneInspectionNudges(bool $dryRun = false): array
    {
        $stats = ['evaluated' => 0, 'triggered' => 0, 'skipped' => 0, 'errors' => 0, 'triggers' => []];

        $verifications = MilestoneVerification::where('client_approval_status', 'pending')
            ->where(function ($q) {
                $q->whereNotNull('engineer_signed_at')->orWhereNotNull('inspection_date');
            })
            ->with(['client.user'])
            ->get();

        foreach ($verifications as $ver) {
            $stats['evaluated']++;

            try {
                $inspectionDate = $ver->engineer_signed_at ?? $ver->inspection_date ?? $ver->created_at;
                $hoursSinceInspection = abs((int) Carbon::now()->diffInHours(Carbon::parse($inspectionDate)));

                if ($hoursSinceInspection < 48) {
                    $stats['skipped']++;
                    continue;
                }

                $triggerKey = "milestone_nudge_{$ver->id}_48h";

                if (NotificationDripTrigger::where('trigger_key', $triggerKey)->exists()) {
                    $stats['skipped']++;
                    continue;
                }

                $user = $ver->client_user_id ? User::find($ver->client_user_id) : ($ver->client?->user ?? null);
                if (!$user) {
                    $stats['skipped']++;
                    continue;
                }

                $title = "Action Required: Sign Off Milestone Verification ({$ver->title})";
                $message = "The site inspection for '{$ver->title}' was completed {$hoursSinceInspection} hours ago ({$ver->physical_completion_percentage}% verified). Please review progress photos and confirm Quick-PIN sign-off to proceed.";

                $attemptedChannels = ['in_app', 'email', 'whatsapp'];
                $succeededChannels = [];
                $dispatchSummary = null;

                if (!$dryRun) {
                    $dispatchResult = $this->dispatcher->dispatchToUser($user, [
                        'type' => 'milestone_approval_required',
                        'title' => $title,
                        'message' => $message,
                        'category' => 'construction',
                        'priority' => 'high',
                        'action_url' => '/portal/construction',
                        'data' => [
                            'verification_id' => $ver->id,
                            'milestone_id' => $ver->milestone_id,
                            'completion_percentage' => (float) $ver->physical_completion_percentage,
                        ],
                    ]);

                    $dispatchSummary = $dispatchResult;
                    foreach ($dispatchResult['channels'] ?? [] as $ch => $info) {
                        if (($info['status'] ?? '') === 'sent' || ($info['status'] ?? '') === 'delivered') {
                            $succeededChannels[] = $ch;
                        }
                    }
                }

                $trigger = NotificationDripTrigger::create([
                    'campaign_type' => 'milestone_nudge',
                    'trigger_key' => $triggerKey,
                    'recipient_user_id' => $user->id,
                    'recipient_client_id' => $ver->client_id,
                    'entity_type' => MilestoneVerification::class,
                    'entity_id' => $ver->id,
                    'title' => $title,
                    'message' => $message,
                    'channels_attempted' => $attemptedChannels,
                    'channels_succeeded' => $dryRun ? [] : $succeededChannels,
                    'status' => $dryRun ? 'skipped' : 'dispatched',
                    'is_dry_run' => $dryRun,
                    'dispatch_summary' => $dispatchSummary,
                    'dispatched_at' => $dryRun ? null : Carbon::now(),
                    'metadata' => [
                        'verification_title' => $ver->title,
                        'milestone_id' => $ver->milestone_id,
                        'completion_percentage' => (float) $ver->physical_completion_percentage,
                        'hours_pending' => $hoursSinceInspection,
                    ],
                ]);

                $stats['triggered']++;
                $stats['triggers'][] = [
                    'id' => $trigger->id,
                    'key' => $triggerKey,
                    'verification_title' => $ver->title,
                ];
            } catch (\Throwable $e) {
                Log::error("Milestone nudge drip error on verification {$ver->id}: " . $e->getMessage());
                $stats['errors']++;
            }
        }

        return $stats;
    }

    /**
     * Workflow 4: Dormant Client Re-engagement (> 30 days inactivity)
     */
    public function processDormantClientReengagement(bool $dryRun = false): array
    {
        $stats = ['evaluated' => 0, 'triggered' => 0, 'skipped' => 0, 'errors' => 0, 'triggers' => []];

        $dormantUsers = User::where(function ($q) {
            $thirtyDaysAgo = Carbon::now()->subDays(30);
            $q->where('last_login_at', '<', $thirtyDaysAgo)
              ->orWhere(function ($sub) use ($thirtyDaysAgo) {
                  $sub->whereNull('last_login_at')->where('created_at', '<', $thirtyDaysAgo);
              });
        })
        ->with('client')
        ->limit(100)
        ->get();

        $monthKey = Carbon::now()->format('Y_m');

        foreach ($dormantUsers as $user) {
            $stats['evaluated']++;

            try {
                $triggerKey = "dormant_reengage_{$user->id}_{$monthKey}";

                if (NotificationDripTrigger::where('trigger_key', $triggerKey)->exists()) {
                    $stats['skipped']++;
                    continue;
                }

                $name = $user->client?->first_name ?: ($user->name ?: 'valued client');
                $title = "We miss you at Fab Homes! Discover your estate milestones";
                $message = "Hello {$name}, new developments have taken place across our estates! Check your client portal for new site photos and your updated savings roadmap.";

                $attemptedChannels = ['in_app', 'email'];
                $succeededChannels = [];
                $dispatchSummary = null;

                if (!$dryRun) {
                    $dispatchResult = $this->dispatcher->dispatchToUser($user, [
                        'type' => 'system_notice',
                        'title' => $title,
                        'message' => $message,
                        'category' => 'general',
                        'priority' => 'low',
                        'action_url' => '/portal/dashboard',
                        'data' => [
                            'campaign' => 'reengagement',
                        ],
                    ]);

                    $dispatchSummary = $dispatchResult;
                    foreach ($dispatchResult['channels'] ?? [] as $ch => $info) {
                        if (($info['status'] ?? '') === 'sent' || ($info['status'] ?? '') === 'delivered') {
                            $succeededChannels[] = $ch;
                        }
                    }
                }

                $trigger = NotificationDripTrigger::create([
                    'campaign_type' => 'dormant_client',
                    'trigger_key' => $triggerKey,
                    'recipient_user_id' => $user->id,
                    'recipient_client_id' => $user->client?->id,
                    'entity_type' => User::class,
                    'entity_id' => $user->id,
                    'title' => $title,
                    'message' => $message,
                    'channels_attempted' => $attemptedChannels,
                    'channels_succeeded' => $dryRun ? [] : $succeededChannels,
                    'status' => $dryRun ? 'skipped' : 'dispatched',
                    'is_dry_run' => $dryRun,
                    'dispatch_summary' => $dispatchSummary,
                    'dispatched_at' => $dryRun ? null : Carbon::now(),
                    'metadata' => [
                        'last_login_at' => $user->last_login_at?->toIso8601String(),
                        'client_name' => $name,
                    ],
                ]);

                $stats['triggered']++;
                $stats['triggers'][] = [
                    'id' => $trigger->id,
                    'key' => $triggerKey,
                    'user_id' => $user->id,
                ];
            } catch (\Throwable $e) {
                Log::error("Dormant client drip error on user {$user->id}: " . $e->getMessage());
                $stats['errors']++;
            }
        }

        return $stats;
    }

    /**
     * Get aggregate telemetry metrics on all drip campaigns
     */
    public function getDripSummary(): array
    {
        $totalTriggers = NotificationDripTrigger::count();
        $dispatchedCount = NotificationDripTrigger::where('status', 'dispatched')->count();
        $dryRunCount = NotificationDripTrigger::where('is_dry_run', true)->count();
        $skippedCount = NotificationDripTrigger::where('status', 'skipped')->count();
        $failedCount = NotificationDripTrigger::where('status', 'failed')->count();

        $past24h = NotificationDripTrigger::where('created_at', '>=', Carbon::now()->subDay())->count();
        $past7d = NotificationDripTrigger::where('created_at', '>=', Carbon::now()->subDays(7))->count();

        $byCampaign = NotificationDripTrigger::select('campaign_type', DB::raw('count(*) as total'))
            ->groupBy('campaign_type')
            ->pluck('total', 'campaign_type')
            ->toArray();

        $recentTriggers = NotificationDripTrigger::with(['user', 'client'])
            ->latest()
            ->limit(10)
            ->get();

        return [
            'total_triggers' => $totalTriggers,
            'dispatched_count' => $dispatchedCount,
            'dry_run_count' => $dryRunCount,
            'skipped_count' => $skippedCount,
            'failed_count' => $failedCount,
            'past_24h' => $past24h,
            'past_7d' => $past7d,
            'by_campaign' => $byCampaign,
            'active_workflows' => [
                [
                    'name' => 'Savings Contribution Reminders',
                    'id' => 'savings',
                    'frequency' => 'Monthly / Weekly',
                    'channels' => ['In-App', 'Email', 'SMS', 'WhatsApp'],
                    'status' => 'active',
                ],
                [
                    'name' => 'Plot Reservation Expiry Countdown',
                    'id' => 'reservations',
                    'frequency' => '7d, 3d, 24h Thresholds',
                    'channels' => ['In-App', 'Email', 'SMS', 'WhatsApp'],
                    'status' => 'active',
                ],
                [
                    'name' => 'Milestone Inspection Sign-Off Nudges',
                    'id' => 'milestones',
                    'frequency' => '48h Unapproved Trigger',
                    'channels' => ['In-App', 'Email', 'WhatsApp'],
                    'status' => 'active',
                ],
                [
                    'name' => 'Dormant Client Re-engagement',
                    'id' => 'dormant',
                    'frequency' => '30+ Days Inactivity',
                    'channels' => ['In-App', 'Email'],
                    'status' => 'active',
                ],
            ],
            'recent_triggers' => $recentTriggers,
        ];
    }

    /**
     * Get paginated audit logs for drip campaigns
     */
    public function getDripLogs(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = NotificationDripTrigger::with(['user', 'client'])->latest();

        if (!empty($filters['campaign_type'])) {
            $query->where('campaign_type', $filters['campaign_type']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['dry_run']) && $filters['dry_run'] !== '') {
            $query->where('is_dry_run', filter_var($filters['dry_run'], FILTER_VALIDATE_BOOLEAN));
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('trigger_key', 'LIKE', "%{$search}%")
                  ->orWhere('title', 'LIKE', "%{$search}%")
                  ->orWhere('message', 'LIKE', "%{$search}%");
            });
        }

        return $query->paginate($perPage);
    }
}
