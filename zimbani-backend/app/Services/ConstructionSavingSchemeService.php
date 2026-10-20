<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\ConstructionMilestone;
use App\Models\ConstructionSavingScheme;
use App\Models\MilestoneSavingsPool;
use App\Models\Payment;
use App\Models\Project;
use App\Models\SavingsAccount;
use App\Models\SavingsPoolAllocation;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ConstructionSavingSchemeService
{
    /**
     * Seed or return standard schemes.
     */
    public function seedDefaultSchemes(?User $user = null): Collection
    {
        $standards = [
            [
                'scheme_code' => 'CSS-VILLA-4BR',
                'name' => 'Fab Standard 4-Bedroom Villa Construction Scheme',
                'description' => 'Sequential 6-tier milestone savings pool designed for multi-story residential executive villas.',
                'project_type' => 'residential',
                'currency' => 'UGX',
                'standard_target_amount' => 250000000.00,
                'minimum_initial_deposit' => 15000000.00,
                'minimum_milestone_threshold_percentage' => 100.00,
                'waterfall_auto_allocation' => true,
                'is_active' => true,
                'milestone_template' => ConstructionSavingScheme::getStandardMilestoneTemplates('residential_villa'),
            ],
            [
                'scheme_code' => 'CSS-BUNG-3BR',
                'name' => 'Fab Standard 3-Bedroom Bungalow Construction Scheme',
                'description' => 'Structured 6-tier savings pool optimized for single-story family bungalow residences.',
                'project_type' => 'residential',
                'currency' => 'UGX',
                'standard_target_amount' => 180000000.00,
                'minimum_initial_deposit' => 10000000.00,
                'minimum_milestone_threshold_percentage' => 100.00,
                'waterfall_auto_allocation' => true,
                'is_active' => true,
                'milestone_template' => ConstructionSavingScheme::getStandardMilestoneTemplates('residential_villa'),
            ],
            [
                'scheme_code' => 'CSS-STARTER-2BR',
                'name' => 'Fab Starter 2-Bedroom Core Home Scheme',
                'description' => 'Fast-track 5-tier milestone savings plan for starter homeowners and expandable core units.',
                'project_type' => 'residential',
                'currency' => 'UGX',
                'standard_target_amount' => 95000000.00,
                'minimum_initial_deposit' => 5000000.00,
                'minimum_milestone_threshold_percentage' => 100.00,
                'waterfall_auto_allocation' => true,
                'is_active' => true,
                'milestone_template' => [
                    [
                        'tier_order' => 1,
                        'name' => 'Substructure & Foundation',
                        'weight_percentage' => 25.00,
                        'description' => 'Footing excavation, ground beam, concrete slab, and foundation masonry.',
                    ],
                    [
                        'tier_order' => 2,
                        'name' => 'Superstructure & Wall Plate',
                        'weight_percentage' => 30.00,
                        'description' => 'Brickwork walling, ring beam, lintels, and door/window frame fixing.',
                    ],
                    [
                        'tier_order' => 3,
                        'name' => 'Roofing & Rainwater Disposal',
                        'weight_percentage' => 20.00,
                        'description' => 'Timber trusses, corrugated iron/metal sheet roofing, and gutters.',
                    ],
                    [
                        'tier_order' => 4,
                        'name' => 'Plastering, Glazing & MEP',
                        'weight_percentage' => 15.00,
                        'description' => 'Internal/external plaster, wiring rough-in, plumbing, and window glass.',
                    ],
                    [
                        'tier_order' => 5,
                        'name' => 'Finishing & Handover',
                        'weight_percentage' => 10.00,
                        'description' => 'Floor screed, sanitary fixtures, painting, and site handover.',
                    ],
                ],
            ],
        ];

        $results = collect();
        foreach ($standards as $item) {
            $scheme = ConstructionSavingScheme::firstOrCreate(
                ['scheme_code' => $item['scheme_code']],
                array_merge($item, [
                    'created_by' => $user?->id ?? 1,
                    'updated_by' => $user?->id ?? 1,
                ])
            );
            $results->push($scheme);
        }

        return $results;
    }

    /**
     * Create a new custom or template construction saving scheme.
     */
    public function createScheme(array $data, ?User $user = null): ConstructionSavingScheme
    {
        return DB::transaction(function () use ($data, $user) {
            $milestones = $data['milestone_template'] ?? ConstructionSavingScheme::getStandardMilestoneTemplates();

            // Validate weights sum to 100%
            $totalWeight = array_sum(array_column($milestones, 'weight_percentage'));
            if (abs($totalWeight - 100.00) > 0.5) {
                throw new InvalidArgumentException("Milestone weight percentages must sum to 100%. Current sum: {$totalWeight}%");
            }

            $scheme = ConstructionSavingScheme::create([
                'scheme_code' => $data['scheme_code'] ?? ConstructionSavingScheme::generateSchemeCode($data['project_type'] ?? 'RES'),
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'project_type' => $data['project_type'] ?? 'residential',
                'currency' => $data['currency'] ?? 'UGX',
                'standard_target_amount' => $data['standard_target_amount'] ?? 0.00,
                'minimum_initial_deposit' => $data['minimum_initial_deposit'] ?? 0.00,
                'minimum_milestone_threshold_percentage' => $data['minimum_milestone_threshold_percentage'] ?? 100.00,
                'waterfall_auto_allocation' => $data['waterfall_auto_allocation'] ?? true,
                'is_active' => $data['is_active'] ?? true,
                'milestone_template' => $milestones,
                'created_by' => $user?->id ?? auth()->id(),
                'updated_by' => $user?->id ?? auth()->id(),
            ]);

            Activity::log(
                'construction_scheme_created',
                "Created construction saving scheme {$scheme->name} ({$scheme->scheme_code})",
                $scheme,
                $user ?? auth()->user()
            );

            return $scheme;
        });
    }

    /**
     * Enroll a savings account into a Construction Saving Scheme and generate tiered milestone savings pools.
     */
    public function enrollAccountInScheme(
        SavingsAccount $account,
        ConstructionSavingScheme $scheme,
        ?Project $project = null,
        ?User $user = null
    ): SavingsAccount {
        return DB::transaction(function () use ($account, $scheme, $project, $user) {
            // Update account
            $account->construction_saving_scheme_id = $scheme->id;
            $account->scheme_name = $scheme->name;
            if ($project) {
                $account->project_id = $project->id;
            }
            if ($account->target_amount <= 0 && $scheme->standard_target_amount > 0) {
                $account->target_amount = $scheme->standard_target_amount;
            }
            if (empty($account->currency)) {
                $account->currency = $scheme->currency;
            }
            $account->is_waterfall_allocation_enabled = $scheme->waterfall_auto_allocation;
            $account->save();

            // Clear any previously existing unfunded pools if re-enrolling
            $existingPools = $account->milestonePools;
            if ($existingPools->isNotEmpty()) {
                $hasLockedOrDisbursed = $existingPools->contains(fn($p) => $p->locked_amount > 0 || $p->disbursed_amount > 0);
                if (!$hasLockedOrDisbursed) {
                    MilestoneSavingsPool::where('savings_account_id', $account->id)->delete();
                } else {
                    throw new InvalidArgumentException("Cannot re-enroll account in a different scheme because some milestone pools already contain locked or disbursed funds.");
                }
            }

            // Generate tiered milestone pools from template
            $templates = $scheme->milestone_template ?? ConstructionSavingScheme::getStandardMilestoneTemplates();
            $effectiveTarget = (float) $account->target_amount > 0 ? (float) $account->target_amount : (float) $scheme->standard_target_amount;

            $linkedProjectMilestones = $project ? $project->milestones()->orderBy('milestone_order')->get() : collect();

            foreach ($templates as $tmpl) {
                $weight = (float) ($tmpl['weight_percentage'] ?? 0);
                $tierTarget = round($effectiveTarget * ($weight / 100), 2);

                // Check if matching project milestone exists
                $matchedMilestone = null;
                if ($linkedProjectMilestones->isNotEmpty()) {
                    $matchedMilestone = $linkedProjectMilestones->firstWhere('milestone_order', $tmpl['tier_order'])
                        ?? $linkedProjectMilestones->first(fn($m) => stripos($m->milestone_name, $tmpl['name']) !== false);
                }

                $pool = MilestoneSavingsPool::create([
                    'savings_account_id' => $account->id,
                    'project_id' => $project?->id ?? $account->project_id,
                    'construction_milestone_id' => $matchedMilestone?->id,
                    'tier_order' => $tmpl['tier_order'],
                    'milestone_name' => $tmpl['name'],
                    'description' => $tmpl['description'] ?? null,
                    'target_amount' => $tierTarget,
                    'allocated_amount' => 0.00,
                    'locked_amount' => 0.00,
                    'disbursed_amount' => 0.00,
                    'currency' => $account->currency,
                    'weight_percentage' => $weight,
                    'status' => 'unfunded',
                    'created_by' => $user?->id ?? auth()->id(),
                    'updated_by' => $user?->id ?? auth()->id(),
                ]);

                // Link backwards to physical milestone if present
                if ($matchedMilestone && empty($matchedMilestone->milestone_savings_pool_id)) {
                    $matchedMilestone->milestone_savings_pool_id = $pool->id;
                    $matchedMilestone->save();
                }
            }

            // If account has existing balance, auto-allocate via waterfall
            if ($account->current_balance > 0) {
                $this->allocateDeposit(
                    $account,
                    (float) $account->current_balance,
                    null,
                    'waterfall',
                    null,
                    $user
                );
            }

            Activity::log(
                'account_enrolled_in_construction_scheme',
                "Enrolled savings account {$account->account_number} into {$scheme->name} with tiered milestone pools",
                $account,
                $user ?? auth()->user()
            );

            return $account->fresh(['milestonePools', 'constructionScheme']);
        });
    }

    /**
     * Allocate incoming deposit or available funds into milestone savings pools.
     * Supports 'waterfall' (sequential auto-filling) or 'custom' allocations.
     */
    public function allocateDeposit(
        SavingsAccount $account,
        float $amount,
        ?int $paymentId = null,
        string $mode = 'waterfall',
        ?array $customAllocations = null,
        ?User $user = null
    ): array {
        if ($amount <= 0) {
            throw new InvalidArgumentException("Allocation amount must be greater than zero.");
        }

        return DB::transaction(function () use ($account, $amount, $paymentId, $mode, $customAllocations, $user) {
            $pools = $account->milestonePools()->orderBy('tier_order')->get();
            if ($pools->isEmpty()) {
                throw new InvalidArgumentException("Savings account has no milestone pools configured. Enroll account into a construction scheme first.");
            }

            $allocationsCreated = [];
            $remainingToAllocate = $amount;

            if ($mode === 'waterfall') {
                foreach ($pools as $pool) {
                    if ($remainingToAllocate <= 0) {
                        break;
                    }

                    $poolShortfall = max(0.0, (float) $pool->target_amount - (float) $pool->allocated_amount);
                    if ($poolShortfall <= 0.001) {
                        continue; // Pool already fully funded
                    }

                    $allocatedToThisPool = min($remainingToAllocate, $poolShortfall);
                    $balanceBefore = (float) $pool->allocated_amount;
                    $balanceAfter = $balanceBefore + $allocatedToThisPool;

                    $pool->allocated_amount = $balanceAfter;
                    if ($balanceAfter >= $pool->target_amount) {
                        $pool->status = $pool->locked_amount > 0 ? 'locked' : 'fully_funded';
                        if (!$pool->funded_at) {
                            $pool->funded_at = now();
                        }
                    } else {
                        $pool->status = 'partially_funded';
                    }
                    $pool->updated_by = $user?->id ?? auth()->id();
                    $pool->save();

                    // Create allocation audit record
                    $allocTx = SavingsPoolAllocation::create([
                        'savings_account_id' => $account->id,
                        'milestone_savings_pool_id' => $pool->id,
                        'payment_id' => $paymentId,
                        'allocation_type' => 'deposit_allocation',
                        'amount' => $allocatedToThisPool,
                        'balance_before' => $balanceBefore,
                        'balance_after' => $balanceAfter,
                        'notes' => "Waterfall deposit allocation to Tier {$pool->tier_order}: {$pool->milestone_name}",
                        'allocated_by' => $user?->id ?? auth()->id(),
                    ]);

                    $allocationsCreated[] = $allocTx;
                    $remainingToAllocate -= $allocatedToThisPool;
                }

                // If any remainder left over after all pools are 100% filled, put excess into last pool
                if ($remainingToAllocate > 0.01) {
                    $lastPool = $pools->last();
                    $bBefore = (float) $lastPool->allocated_amount;
                    $bAfter = $bBefore + $remainingToAllocate;

                    $lastPool->allocated_amount = $bAfter;
                    $lastPool->save();

                    $allocTx = SavingsPoolAllocation::create([
                        'savings_account_id' => $account->id,
                        'milestone_savings_pool_id' => $lastPool->id,
                        'payment_id' => $paymentId,
                        'allocation_type' => 'deposit_allocation',
                        'amount' => $remainingToAllocate,
                        'balance_before' => $bBefore,
                        'balance_after' => $bAfter,
                        'notes' => "Surplus savings allocated to final Tier {$lastPool->tier_order}: {$lastPool->milestone_name}",
                        'allocated_by' => $user?->id ?? auth()->id(),
                    ]);
                    $allocationsCreated[] = $allocTx;
                }
            } else {
                // Custom allocation per pool ID: e.g. [ pool_id => amount ]
                if (empty($customAllocations)) {
                    throw new InvalidArgumentException("Custom allocation mode requires customAllocations mapping.");
                }

                foreach ($customAllocations as $poolId => $allocAmt) {
                    $allocAmt = (float) $allocAmt;
                    if ($allocAmt <= 0) continue;

                    $targetPool = $pools->firstWhere('id', $poolId);
                    if (!$targetPool) {
                        throw new InvalidArgumentException("Milestone pool ID {$poolId} does not belong to this savings account.");
                    }

                    $bBefore = (float) $targetPool->allocated_amount;
                    $bAfter = $bBefore + $allocAmt;

                    $targetPool->allocated_amount = $bAfter;
                    if ($bAfter >= $targetPool->target_amount) {
                        $targetPool->status = $targetPool->locked_amount > 0 ? 'locked' : 'fully_funded';
                        if (!$targetPool->funded_at) {
                            $targetPool->funded_at = now();
                        }
                    } else {
                        $targetPool->status = 'partially_funded';
                    }
                    $targetPool->updated_by = $user?->id ?? auth()->id();
                    $targetPool->save();

                    $allocTx = SavingsPoolAllocation::create([
                        'savings_account_id' => $account->id,
                        'milestone_savings_pool_id' => $targetPool->id,
                        'payment_id' => $paymentId,
                        'allocation_type' => 'deposit_allocation',
                        'amount' => $allocAmt,
                        'balance_before' => $bBefore,
                        'balance_after' => $bAfter,
                        'notes' => "Custom allocation to Tier {$targetPool->tier_order}: {$targetPool->milestone_name}",
                        'allocated_by' => $user?->id ?? auth()->id(),
                    ]);
                    $allocationsCreated[] = $allocTx;
                }
            }

            // Sync account total allocated
            $account->total_allocated_to_pools = (float) $account->milestonePools()->sum('allocated_amount');
            $account->save();

            Activity::log(
                'deposit_allocated_to_milestone_pools',
                "Allocated {$amount} {$account->currency} ({$mode}) across milestone savings pools for account {$account->account_number}",
                $account,
                $user ?? auth()->user()
            );

            return [
                'total_allocated' => $amount,
                'allocations' => $allocationsCreated,
                'pools' => $account->fresh('milestonePools')->milestonePools,
            ];
        });
    }

    /**
     * Rebalance funds between milestone pools (e.g. shift surplus from Foundation to Superstructure).
     */
    public function rebalancePools(
        SavingsAccount $account,
        int $fromPoolId,
        int $toPoolId,
        float $amount,
        string $reason,
        ?User $user = null
    ): array {
        if ($amount <= 0) {
            throw new InvalidArgumentException("Rebalance amount must be greater than zero.");
        }
        if ($fromPoolId === $toPoolId) {
            throw new InvalidArgumentException("Source and destination milestone pools cannot be identical.");
        }

        return DB::transaction(function () use ($account, $fromPoolId, $toPoolId, $amount, $reason, $user) {
            $fromPool = MilestoneSavingsPool::where('id', $fromPoolId)
                ->where('savings_account_id', $account->id)
                ->firstOrFail();

            $toPool = MilestoneSavingsPool::where('id', $toPoolId)
                ->where('savings_account_id', $account->id)
                ->firstOrFail();

            if ($fromPool->available_to_lock < $amount) {
                throw new InvalidArgumentException(
                    "Insufficient un-locked savings in pool '{$fromPool->milestone_name}'. Available to shift: {$fromPool->available_to_lock} {$fromPool->currency}, Requested: {$amount}"
                );
            }

            // Debit from source pool
            $fromBefore = (float) $fromPool->allocated_amount;
            $fromAfter = $fromBefore - $amount;
            $fromPool->allocated_amount = $fromAfter;
            if ($fromAfter < $fromPool->target_amount) {
                $fromPool->status = $fromAfter > 0 ? 'partially_funded' : 'unfunded';
            }
            $fromPool->save();

            // Credit to destination pool
            $toBefore = (float) $toPool->allocated_amount;
            $toAfter = $toBefore + $amount;
            $toPool->allocated_amount = $toAfter;
            if ($toAfter >= $toPool->target_amount) {
                $toPool->status = $toPool->locked_amount > 0 ? 'locked' : 'fully_funded';
                if (!$toPool->funded_at) {
                    $toPool->funded_at = now();
                }
            } else {
                $toPool->status = 'partially_funded';
            }
            $toPool->save();

            // Record two-legged rebalance allocation ledger
            $debitTx = SavingsPoolAllocation::create([
                'savings_account_id' => $account->id,
                'milestone_savings_pool_id' => $fromPool->id,
                'source_pool_id' => $toPool->id,
                'allocation_type' => 'manual_rebalance',
                'amount' => -$amount,
                'balance_before' => $fromBefore,
                'balance_after' => $fromAfter,
                'notes' => "Rebalance shift OUT to Tier {$toPool->tier_order} ({$toPool->milestone_name}): {$reason}",
                'allocated_by' => $user?->id ?? auth()->id(),
            ]);

            $creditTx = SavingsPoolAllocation::create([
                'savings_account_id' => $account->id,
                'milestone_savings_pool_id' => $toPool->id,
                'source_pool_id' => $fromPool->id,
                'allocation_type' => 'manual_rebalance',
                'amount' => $amount,
                'balance_before' => $toBefore,
                'balance_after' => $toAfter,
                'notes' => "Rebalance shift IN from Tier {$fromPool->tier_order} ({$fromPool->milestone_name}): {$reason}",
                'allocated_by' => $user?->id ?? auth()->id(),
            ]);

            Activity::log(
                'milestone_pools_rebalanced',
                "Rebalanced {$amount} {$account->currency} from '{$fromPool->milestone_name}' to '{$toPool->milestone_name}' ({$reason})",
                $account,
                $user ?? auth()->user()
            );

            return [
                'from_pool' => $fromPool->fresh(),
                'to_pool' => $toPool->fresh(),
                'debit_transaction' => $debitTx,
                'credit_transaction' => $creditTx,
            ];
        });
    }

    /**
     * Lock milestone pool funds in escrow so site construction can safely commence.
     */
    public function lockMilestonePool(
        MilestoneSavingsPool $pool,
        ?float $amount = null,
        ?User $user = null
    ): MilestoneSavingsPool {
        return DB::transaction(function () use ($pool, $amount, $user) {
            $lockAmount = $amount ?? ((float) $pool->allocated_amount - (float) $pool->disbursed_amount);

            if ($lockAmount <= 0) {
                throw new InvalidArgumentException("Lock amount must be greater than zero.");
            }

            $available = $pool->available_to_lock;
            if ($available < $lockAmount) {
                throw new InvalidArgumentException(
                    "Cannot lock {$lockAmount} {$pool->currency}. Only {$available} {$pool->currency} available in pool."
                );
            }

            // Verify funding threshold if scheme dictates
            $scheme = $pool->savingsAccount->constructionScheme;
            $minThreshold = $scheme ? (float) $scheme->minimum_milestone_threshold_percentage : 100.0;
            $currentFundingRatio = $pool->target_amount > 0 ? ($pool->allocated_amount / $pool->target_amount) * 100 : 100;

            if ($currentFundingRatio < $minThreshold) {
                throw new InvalidArgumentException(
                    "Milestone pool '{$pool->milestone_name}' has reached {$currentFundingRatio}%, but requires minimum {$minThreshold}% funding to lock and commence site work."
                );
            }

            $bBefore = (float) $pool->locked_amount;
            $bAfter = $bBefore + $lockAmount;

            $pool->locked_amount = $bAfter;
            $pool->status = 'locked';
            if (!$pool->commenced_at) {
                $pool->commenced_at = now();
            }
            $pool->updated_by = $user?->id ?? auth()->id();
            $pool->save();

            // Sync account total locked
            $account = $pool->savingsAccount;
            $account->total_locked_in_pools = (float) $account->milestonePools()->sum('locked_amount');
            $account->save();

            // Link to physical milestone: activate milestone if pending
            if ($pool->construction_milestone_id) {
                $cm = $pool->constructionMilestone;
                if ($cm && $cm->status === 'pending') {
                    $cm->status = 'in_progress';
                    $cm->actual_start_date = $cm->actual_start_date ?? now()->toDateString();
                    $cm->save();
                }
            }

            SavingsPoolAllocation::create([
                'savings_account_id' => $account->id,
                'milestone_savings_pool_id' => $pool->id,
                'allocation_type' => 'escrow_lock',
                'amount' => $lockAmount,
                'balance_before' => $bBefore,
                'balance_after' => $bAfter,
                'notes' => "Committed {$lockAmount} {$pool->currency} to escrow lock for site work commencement",
                'allocated_by' => $user?->id ?? auth()->id(),
            ]);

            Activity::log(
                'milestone_pool_locked',
                "Locked {$lockAmount} {$pool->currency} in escrow for milestone '{$pool->milestone_name}' (Pool {$pool->pool_code})",
                $pool,
                $user ?? auth()->user()
            );

            return $pool->fresh(['savingsAccount', 'constructionMilestone']);
        });
    }

    /**
     * Disburse funds from a locked milestone pool when physical milestone verification is released.
     */
    public function disburseFromPool(
        MilestoneSavingsPool $pool,
        float $amount,
        ?int $releaseId = null,
        ?User $user = null
    ): MilestoneSavingsPool {
        return DB::transaction(function () use ($pool, $amount, $releaseId, $user) {
            if ($amount <= 0) {
                throw new InvalidArgumentException("Disbursement amount must be greater than zero.");
            }

            $currentLocked = (float) $pool->locked_amount;
            if ($currentLocked < $amount) {
                throw new InvalidArgumentException(
                    "Cannot disburse {$amount} {$pool->currency}: only {$currentLocked} {$pool->currency} currently locked in pool '{$pool->milestone_name}'."
                );
            }

            $lockedAfter = $currentLocked - $amount;
            $disbursedBefore = (float) $pool->disbursed_amount;
            $disbursedAfter = $disbursedBefore + $amount;

            $pool->locked_amount = $lockedAfter;
            $pool->disbursed_amount = $disbursedAfter;

            if ($disbursedAfter >= (float) $pool->target_amount) {
                $pool->status = 'fully_disbursed';
                if (!$pool->completed_at) {
                    $pool->completed_at = now();
                }
            } else {
                $pool->status = 'partially_disbursed';
            }
            $pool->updated_by = $user?->id ?? auth()->id();
            $pool->save();

            // Sync account total locked
            $account = $pool->savingsAccount;
            $account->total_locked_in_pools = (float) $account->milestonePools()->sum('locked_amount');
            $account->save();

            SavingsPoolAllocation::create([
                'savings_account_id' => $account->id,
                'milestone_savings_pool_id' => $pool->id,
                'milestone_payment_release_id' => $releaseId,
                'allocation_type' => 'milestone_disbursement',
                'amount' => $amount,
                'balance_before' => $disbursedBefore,
                'balance_after' => $disbursedAfter,
                'notes' => "Disbursed {$amount} {$pool->currency} from pool against milestone payment release",
                'allocated_by' => $user?->id ?? auth()->id(),
            ]);

            Activity::log(
                'milestone_pool_disbursed',
                "Disbursed {$amount} {$pool->currency} from pool '{$pool->milestone_name}' (Release #{$releaseId})",
                $pool,
                $user ?? auth()->user()
            );

            return $pool->fresh();
        });
    }

    /**
     * Get a comprehensive readiness and funding audit for a construction savings account.
     */
    public function getAccountReadinessAudit(SavingsAccount $account): array
    {
        $pools = $account->milestonePools()->orderBy('tier_order')->get();
        $scheme = $account->constructionScheme;

        $totalTarget = (float) $account->target_amount;
        $totalSaved = (float) $account->current_balance;
        $totalAllocated = (float) $pools->sum('allocated_amount');
        $unallocated = max(0.0, $totalSaved - $totalAllocated);
        $totalLocked = (float) $pools->sum('locked_amount');
        $totalDisbursed = (float) $pools->sum('disbursed_amount');

        $fundedPoolsCount = $pools->whereIn('status', ['fully_funded', 'locked', 'partially_disbursed', 'fully_disbursed'])->count();
        $activePool = $pools->firstWhere('status', 'locked') ?? $pools->firstWhere('status', 'partially_disbursed');
        $nextEligiblePool = $pools->first(fn($p) => in_array($p->status, ['unfunded', 'partially_funded', 'fully_funded']) && $p->locked_amount <= 0 && $p->disbursed_amount <= 0);

        $shortfallForNext = 0.0;
        $canCommenceNext = false;
        if ($nextEligiblePool) {
            $shortfallForNext = max(0.0, (float) $nextEligiblePool->target_amount - (float) $nextEligiblePool->allocated_amount);
            $canCommenceNext = $nextEligiblePool->can_commence_work;
        }

        return [
            'account_number' => $account->account_number,
            'scheme_name' => $scheme?->name ?? $account->scheme_name,
            'scheme_code' => $scheme?->scheme_code,
            'currency' => $account->currency,
            'total_target' => $totalTarget,
            'total_saved' => $totalSaved,
            'overall_progress_percentage' => $account->progress_percentage,
            'total_allocated' => $totalAllocated,
            'unallocated_balance' => $unallocated,
            'total_locked' => $totalLocked,
            'total_disbursed' => $totalDisbursed,
            'pools_count' => $pools->count(),
            'funded_pools_count' => $fundedPoolsCount,
            'active_milestone_pool' => $activePool ? [
                'id' => $activePool->id,
                'uuid' => $activePool->uuid,
                'tier_order' => $activePool->tier_order,
                'milestone_name' => $activePool->milestone_name,
                'locked_amount' => $activePool->locked_amount,
                'disbursed_amount' => $activePool->disbursed_amount,
            ] : null,
            'next_milestone_pool' => $nextEligiblePool ? [
                'id' => $nextEligiblePool->id,
                'uuid' => $nextEligiblePool->uuid,
                'tier_order' => $nextEligiblePool->tier_order,
                'milestone_name' => $nextEligiblePool->milestone_name,
                'target_amount' => $nextEligiblePool->target_amount,
                'allocated_amount' => $nextEligiblePool->allocated_amount,
                'shortfall' => $shortfallForNext,
                'can_commence' => $canCommenceNext,
                'funding_percentage' => $nextEligiblePool->funding_percentage,
            ] : null,
            'waterfall_enabled' => (bool) $account->is_waterfall_allocation_enabled,
            'pools' => $pools,
        ];
    }
}
