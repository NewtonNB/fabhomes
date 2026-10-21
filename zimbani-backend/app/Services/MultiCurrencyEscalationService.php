<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Client;
use App\Models\FxExchangeRate;
use App\Models\FxHedgingContract;
use App\Models\MaterialPriceIndex;
use App\Models\MaterialPriceRecord;
use App\Models\MilestoneSavingsPool;
use App\Models\SavingsAccount;
use App\Models\SavingsPoolAllocation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class MultiCurrencyEscalationService
{
    /**
     * Default FX Exchange Rates against UGX
     */
    public const DEFAULT_FX_RATES = [
        'USD' => ['spot' => 3745.00, 'buy' => 3738.00, 'sell' => 3752.00],
        'GBP' => ['spot' => 4880.00, 'buy' => 4868.00, 'sell' => 4895.00],
        'EUR' => ['spot' => 4075.00, 'buy' => 4062.00, 'sell' => 4088.00],
        'KES' => ['spot' => 29.10, 'buy' => 28.75, 'sell' => 29.45],
        'UGX' => ['spot' => 1.00, 'buy' => 1.00, 'sell' => 1.00],
    ];

    /**
     * Seed initial benchmark FX exchange rates
     */
    public function seedDefaultExchangeRates(?User $user = null): array
    {
        $today = now()->toDateString();
        $seeded = [];

        foreach (self::DEFAULT_FX_RATES as $currency => $rates) {
            $rate = FxExchangeRate::updateOrCreate(
                [
                    'base_currency' => $currency,
                    'target_currency' => 'UGX',
                    'rate_date' => $today,
                ],
                [
                    'spot_rate' => $rates['spot'],
                    'buy_rate' => $rates['buy'],
                    'sell_rate' => $rates['sell'],
                    'source' => 'bank_of_uganda',
                    'is_active' => true,
                    'created_by' => $user?->id ?? auth()->id(),
                ]
            );
            $seeded[] = $rate;
        }

        return $seeded;
    }

    /**
     * Record or update an FX exchange rate
     */
    public function recordExchangeRate(array $data, ?User $user = null): FxExchangeRate
    {
        $base = strtoupper($data['base_currency']);
        $target = strtoupper($data['target_currency'] ?? 'UGX');
        $rateDate = !empty($data['rate_date']) ? Carbon::parse($data['rate_date'])->toDateString() : now()->toDateString();

        $spot = (float) $data['spot_rate'];
        $buy = isset($data['buy_rate']) ? (float) $data['buy_rate'] : $spot * 0.998;
        $sell = isset($data['sell_rate']) ? (float) $data['sell_rate'] : $spot * 1.002;

        return FxExchangeRate::updateOrCreate(
            [
                'base_currency' => $base,
                'target_currency' => $target,
                'rate_date' => $rateDate,
            ],
            [
                'spot_rate' => $spot,
                'buy_rate' => $buy,
                'sell_rate' => $sell,
                'source' => $data['source'] ?? 'bank_of_uganda',
                'is_active' => true,
                'created_by' => $user?->id ?? auth()->id(),
            ]
        );
    }

    /**
     * Convert an amount between currencies using current or specific-date spot rates
     */
    public function convertCurrency(float $amount, string $from, string $to, ?string $date = null): array
    {
        $from = strtoupper($from);
        $to = strtoupper($to);

        if ($from === $to) {
            return [
                'original_amount' => $amount,
                'from_currency' => $from,
                'to_currency' => $to,
                'converted_amount' => $amount,
                'exchange_rate' => 1.00,
                'rate_date' => now()->toDateString(),
            ];
        }

        $date = $date ? Carbon::parse($date)->toDateString() : now()->toDateString();

        // 1. Direct pair lookup (e.g. USD -> UGX)
        $rate = FxExchangeRate::forPair($from, $to)
            ->where('rate_date', '<=', $date)
            ->orderByDesc('rate_date')
            ->first();

        if ($rate) {
            $effectiveRate = (float) $rate->spot_rate;
            $converted = round($amount * $effectiveRate, 2);
            return [
                'original_amount' => $amount,
                'from_currency' => $from,
                'to_currency' => $to,
                'converted_amount' => $converted,
                'exchange_rate' => $effectiveRate,
                'rate_date' => $rate->rate_date->toDateString(),
            ];
        }

        // 2. Inverse pair lookup (e.g. UGX -> USD)
        $inverseRate = FxExchangeRate::forPair($to, $from)
            ->where('rate_date', '<=', $date)
            ->orderByDesc('rate_date')
            ->first();

        if ($inverseRate && (float) $inverseRate->spot_rate > 0) {
            $effectiveRate = 1.0 / (float) $inverseRate->spot_rate;
            $converted = round($amount * $effectiveRate, 2);
            return [
                'original_amount' => $amount,
                'from_currency' => $from,
                'to_currency' => $to,
                'converted_amount' => $converted,
                'exchange_rate' => round($effectiveRate, 6),
                'rate_date' => $inverseRate->rate_date->toDateString(),
            ];
        }

        // 3. Fallback to default configured constant
        if (isset(self::DEFAULT_FX_RATES[$from]) && $to === 'UGX') {
            $effectiveRate = self::DEFAULT_FX_RATES[$from]['spot'];
            return [
                'original_amount' => $amount,
                'from_currency' => $from,
                'to_currency' => $to,
                'converted_amount' => round($amount * $effectiveRate, 2),
                'exchange_rate' => $effectiveRate,
                'rate_date' => now()->toDateString(),
            ];
        }

        throw new InvalidArgumentException("Exchange rate not found for currency pair {$from}/{$to}.");
    }

    /**
     * Create forward FX Hedging Contract for diaspora client milestone pool
     */
    public function createHedgingContract(array $data, User $user): FxHedgingContract
    {
        return DB::transaction(function () use ($data, $user) {
            $clientId = $data['client_id'];
            $client = Client::findOrFail($clientId);

            $baseCurrency = strtoupper($data['base_currency']);
            $targetCurrency = strtoupper($data['target_currency'] ?? 'UGX');
            $committedAmount = (float) $data['committed_amount_foreign'];

            if ($committedAmount <= 0) {
                throw new InvalidArgumentException("Committed foreign amount must be greater than zero.");
            }

            // Determine locked exchange rate (if not manually provided, take current spot rate)
            if (!empty($data['locked_exchange_rate'])) {
                $lockedRate = (float) $data['locked_exchange_rate'];
            } else {
                $conv = $this->convertCurrency(1.0, $baseCurrency, $targetCurrency);
                $lockedRate = $conv['exchange_rate'];
            }

            $guaranteedAmountLocal = round($committedAmount * $lockedRate, 2);

            $premiumPct = isset($data['premium_fee_percentage']) ? (float) $data['premium_fee_percentage'] : 0.00;
            $premiumFee = round($guaranteedAmountLocal * ($premiumPct / 100.0), 2);

            $effectiveDate = !empty($data['effective_date']) ? Carbon::parse($data['effective_date'])->toDateString() : now()->toDateString();
            $expiryDays = (int) ($data['lock_duration_days'] ?? 90);
            $expiryDate = Carbon::parse($effectiveDate)->addDays($expiryDays)->toDateString();

            $contract = FxHedgingContract::create([
                'client_id' => $client->id,
                'savings_account_id' => $data['savings_account_id'] ?? null,
                'milestone_savings_pool_id' => $data['milestone_savings_pool_id'] ?? null,
                'base_currency' => $baseCurrency,
                'target_currency' => $targetCurrency,
                'locked_exchange_rate' => $lockedRate,
                'committed_amount_foreign' => $committedAmount,
                'guaranteed_amount_local' => $guaranteedAmountLocal,
                'utilized_amount_foreign' => 0.00,
                'utilized_amount_local' => 0.00,
                'effective_date' => $effectiveDate,
                'expiry_date' => $expiryDate,
                'status' => 'active',
                'premium_fee_percentage' => $premiumPct,
                'premium_fee_amount' => $premiumFee,
                'notes' => $data['notes'] ?? "Diaspora forward FX rate guarantee locked for {$expiryDays} days",
                'approved_by' => $user->id,
            ]);

            Activity::log(
                'fx_hedging_contract_created',
                "Created Forward FX Hedging Lock {$contract->contract_number}: {$committedAmount} {$baseCurrency} locked @ {$lockedRate} {$targetCurrency} (Guaranteed: " . number_format($guaranteedAmountLocal) . " UGX)",
                $contract,
                $user
            );

            return $contract;
        });
    }

    /**
     * Drawdown committed foreign funds from hedging contract into construction savings pool
     */
    public function drawdownHedgingContract(
        FxHedgingContract $contract,
        float $amountForeign,
        ?string $notes = null,
        ?User $user = null
    ): array {
        return DB::transaction(function () use ($contract, $amountForeign, $notes, $user) {
            if ($contract->status !== 'active') {
                throw new InvalidArgumentException("Hedging contract is not active (Status: {$contract->status}).");
            }

            if ($contract->is_expired) {
                $contract->update(['status' => 'expired']);
                throw new InvalidArgumentException("Hedging contract expired on {$contract->expiry_date->toDateString()}.");
            }

            $remainingForeign = (float) $contract->remaining_foreign_amount;
            if ($amountForeign > $remainingForeign + 0.01) {
                throw new InvalidArgumentException("Drawdown amount ({$amountForeign} {$contract->base_currency}) exceeds remaining committed amount ({$remainingForeign} {$contract->base_currency}).");
            }

            $lockedRate = (float) $contract->locked_exchange_rate;
            $localDisbursement = round($amountForeign * $lockedRate, 2);

            $newUtilizedForeign = (float) $contract->utilized_amount_foreign + $amountForeign;
            $newUtilizedLocal = (float) $contract->utilized_amount_local + $localDisbursement;

            $isFullyUtilized = abs($newUtilizedForeign - (float) $contract->committed_amount_foreign) < 0.01;

            $contract->update([
                'utilized_amount_foreign' => $newUtilizedForeign,
                'utilized_amount_local' => $newUtilizedLocal,
                'status' => $isFullyUtilized ? 'fully_utilized' : 'active',
            ]);

            // If milestone savings pool is linked, credit pool allocation
            $poolAllocation = null;
            if ($contract->milestone_savings_pool_id) {
                $pool = MilestoneSavingsPool::find($contract->milestone_savings_pool_id);
                if ($pool) {
                    $bBefore = (float) $pool->allocated_amount;
                    $bAfter = $bBefore + $localDisbursement;
                    $pool->allocated_amount = $bAfter;
                    if ($bAfter >= (float) $pool->target_amount) {
                        $pool->status = $pool->locked_amount > 0 ? 'locked' : 'fully_funded';
                    } else {
                        $pool->status = 'partially_funded';
                    }
                    $pool->save();

                    $poolAllocation = SavingsPoolAllocation::create([
                        'savings_account_id' => $contract->savings_account_id ?? $pool->savings_account_id,
                        'milestone_savings_pool_id' => $pool->id,
                        'allocation_type' => 'deposit_allocation',
                        'amount' => $localDisbursement,
                        'balance_before' => $bBefore,
                        'balance_after' => $bAfter,
                        'notes' => "FX Hedging Drawdown from {$contract->contract_number}: {$amountForeign} {$contract->base_currency} @ {$lockedRate} UGX",
                        'allocated_by' => $user?->id ?? auth()->id(),
                    ]);
                }
            }

            Activity::log(
                'fx_hedging_drawdown_executed',
                "Drawdown of {$amountForeign} {$contract->base_currency} executed on contract {$contract->contract_number}. Credited " . number_format($localDisbursement) . " UGX",
                $contract,
                $user ?? auth()->user()
            );

            return [
                'contract' => $contract->fresh(),
                'drawn_foreign' => $amountForeign,
                'drawn_local' => $localDisbursement,
                'effective_rate' => $lockedRate,
                'remaining_foreign' => $contract->fresh()->remaining_foreign_amount,
                'pool_allocation' => $poolAllocation,
            ];
        });
    }

    /**
     * Seed baseline construction material escalation index & standard basket
     */
    public function seedDefaultMaterialIndex(?User $user = null): MaterialPriceIndex
    {
        return DB::transaction(function () use ($user) {
            $index = MaterialPriceIndex::firstOrCreate(
                ['index_code' => 'MPI-UG-RES-2026'],
                [
                    'name' => 'Uganda Construction Input Price Index (CIPI) - Residential',
                    'description' => 'Composite construction inflation index tracking key building materials in the Kampala/Wakiso corridor.',
                    'project_type' => 'residential',
                    'base_period' => '2026-Q1',
                    'base_index_value' => 100.0000,
                    'current_index_value' => 100.0000,
                    'escalation_percentage' => 0.00,
                    'tolerance_threshold_percentage' => 5.00,
                    'is_active' => true,
                    'last_calculated_at' => now(),
                    'created_by' => $user?->id ?? auth()->id(),
                ]
            );

            $standardBasket = [
                [
                    'item_code' => 'MAT-STEEL-16MM',
                    'item_name' => 'Torsteel High-Tensile Rebar (Y12/Y16)',
                    'unit_of_measure' => 'ton',
                    'basket_weight' => 30.00,
                    'base_price' => 4200000.00,
                    'source' => 'Roofings Rolling Mills / Steel & Tube Ltd',
                ],
                [
                    'item_code' => 'MAT-CEMENT-50KG',
                    'item_name' => 'Portland Cement 32.5R (Tororo/Hima)',
                    'unit_of_measure' => '50kg bag',
                    'basket_weight' => 25.00,
                    'base_price' => 35000.00,
                    'source' => 'Tororo Cement Distributor Hub',
                ],
                [
                    'item_code' => 'MAT-SAND-15T',
                    'item_name' => 'Clean Coarse Lake Plaster Sand',
                    'unit_of_measure' => '15-ton tipper',
                    'basket_weight' => 15.00,
                    'base_price' => 550000.00,
                    'source' => 'Lake Victoria Sand Barge Quarry',
                ],
                [
                    'item_code' => 'MAT-AGG-15T',
                    'item_name' => 'Crushed Machine Granite Aggregate (20mm)',
                    'unit_of_measure' => '15-ton tipper',
                    'basket_weight' => 15.00,
                    'base_price' => 750000.00,
                    'source' => 'Kajjansi Stone Quarry Ltd',
                ],
                [
                    'item_code' => 'MAT-TIMBER-10FT',
                    'item_name' => 'Treated Cypress/Eucalyptus Roofing Trusses',
                    'unit_of_measure' => 'piece (10ft)',
                    'basket_weight' => 10.00,
                    'base_price' => 18000.00,
                    'source' => 'Ndeeba Timber Market Association',
                ],
                [
                    'item_code' => 'MAT-ROOF-G28',
                    'item_name' => 'Pre-painted Zinc-Alum Roofing Sheet (G28)',
                    'unit_of_measure' => 'sheet (3m)',
                    'basket_weight' => 5.00,
                    'base_price' => 42000.00,
                    'source' => 'Uganda Baati Hardware Direct',
                ],
            ];

            $today = now()->toDateString();
            foreach ($standardBasket as $item) {
                MaterialPriceRecord::updateOrCreate(
                    [
                        'material_price_index_id' => $index->id,
                        'item_code' => $item['item_code'],
                    ],
                    [
                        'item_name' => $item['item_name'],
                        'unit_of_measure' => $item['unit_of_measure'],
                        'basket_weight_percentage' => $item['basket_weight'],
                        'base_unit_price' => $item['base_price'],
                        'current_unit_price' => $item['base_price'],
                        'price_variance_percentage' => 0.00,
                        'currency' => 'UGX',
                        'survey_source' => $item['source'],
                        'effective_date' => $today,
                        'recorded_by' => $user?->id ?? auth()->id(),
                    ]
                );
            }

            $index->recalculateIndex();
            return $index->fresh('priceRecords');
        });
    }

    /**
     * Record market spot price update for material basket item and recompute index
     */
    public function recordMaterialPriceUpdate(
        MaterialPriceIndex $index,
        string $itemCode,
        float $newPrice,
        ?string $surveySource = null,
        ?User $user = null
    ): MaterialPriceRecord {
        return DB::transaction(function () use ($index, $itemCode, $newPrice, $surveySource, $user) {
            $record = $index->priceRecords()->where('item_code', $itemCode)->firstOrFail();

            $basePrice = (float) $record->base_unit_price;
            $variancePct = $basePrice > 0 ? round((($newPrice - $basePrice) / $basePrice) * 100, 2) : 0.00;

            $record->update([
                'current_unit_price' => $newPrice,
                'price_variance_percentage' => $variancePct,
                'survey_source' => $surveySource ?? $record->survey_source,
                'effective_date' => now()->toDateString(),
                'recorded_by' => $user?->id ?? auth()->id(),
            ]);

            // Recompute composite index
            $index->recalculateIndex();

            // Log activity
            Activity::log(
                'material_price_updated',
                "Updated {$record->item_name} spot price to " . number_format($newPrice) . " UGX ({$variancePct}% variance). Index {$index->index_code} adjusted to {$index->current_index_value} ({$index->escalation_percentage}%)",
                $index,
                $user ?? auth()->user()
            );

            return $record->fresh();
        });
    }

    /**
     * Calculate BOQ Escalation Adjustment under FIDIC Clause 70 / Price Variation
     */
    public function calculateBoqEscalation(float $initialBoqAmount, MaterialPriceIndex $index): array
    {
        $baseIndex = (float) $index->base_index_value > 0 ? (float) $index->base_index_value : 100.0;
        $currentIndex = (float) $index->current_index_value;
        $escalationPct = (float) $index->escalation_percentage;

        $escalationFactor = $currentIndex / $baseIndex;
        $adjustedContractSum = round($initialBoqAmount * $escalationFactor, 2);
        $escalationDifference = round($adjustedContractSum - $initialBoqAmount, 2);

        $toleranceExceeded = $index->is_tolerance_exceeded;

        return [
            'initial_boq_amount' => $initialBoqAmount,
            'base_index_value' => $baseIndex,
            'current_index_value' => $currentIndex,
            'escalation_percentage' => $escalationPct,
            'adjusted_contract_sum' => $adjustedContractSum,
            'price_adjustment_amount' => $escalationDifference,
            'is_tolerance_exceeded' => $toleranceExceeded,
            'recommended_client_buffer' => $escalationDifference > 0 ? $escalationDifference : 0.00,
            'advisory_notes' => $toleranceExceeded
                ? "WARNING: Construction material escalation ({$escalationPct}%) has breached the {$index->tolerance_threshold_percentage}% tolerance threshold. Recommend issuing material buffer advisory to client."
                : "Escalation ({$escalationPct}%) remains within safe project contingency tolerance.",
        ];
    }

    /**
     * Get aggregate multi-currency & escalation statistics
     */
    public function getStatistics(): array
    {
        $today = now()->toDateString();
        $rates = FxExchangeRate::where('is_active', true)
            ->where('rate_date', '<=', $today)
            ->orderByDesc('rate_date')
            ->get()
            ->unique('base_currency')
            ->keyBy('base_currency');

        $activeHedges = FxHedgingContract::where('status', 'active')->get();
        $totalCommittedUsd = $activeHedges->where('base_currency', 'USD')->sum('committed_amount_foreign');
        $totalGuaranteedUgx = $activeHedges->sum('guaranteed_amount_local');
        $totalUtilizedUgx = $activeHedges->sum('utilized_amount_local');

        $primaryIndex = MaterialPriceIndex::where('is_active', true)->first();

        return [
            'exchange_rates' => [
                'usd_ugx' => (float) ($rates['USD']?->spot_rate ?? 3745.00),
                'gbp_ugx' => (float) ($rates['GBP']?->spot_rate ?? 4880.00),
                'eur_ugx' => (float) ($rates['EUR']?->spot_rate ?? 4075.00),
                'kes_ugx' => (float) ($rates['KES']?->spot_rate ?? 29.10),
            ],
            'hedging_metrics' => [
                'active_contracts_count' => $activeHedges->count(),
                'total_committed_usd' => (float) $totalCommittedUsd,
                'total_guaranteed_ugx' => (float) $totalGuaranteedUgx,
                'total_utilized_ugx' => (float) $totalUtilizedUgx,
                'hedged_coverage_percentage' => $totalGuaranteedUgx > 0 ? round(($totalUtilizedUgx / $totalGuaranteedUgx) * 100, 2) : 0.00,
            ],
            'escalation_metrics' => [
                'index_code' => $primaryIndex?->index_code ?? 'MPI-UG-RES-2026',
                'current_index' => (float) ($primaryIndex?->current_index_value ?? 100.00),
                'escalation_percentage' => (float) ($primaryIndex?->escalation_percentage ?? 0.00),
                'tolerance_threshold' => (float) ($primaryIndex?->tolerance_threshold_percentage ?? 5.00),
                'is_alert_triggered' => $primaryIndex ? $primaryIndex->is_tolerance_exceeded : false,
            ],
        ];
    }
}
