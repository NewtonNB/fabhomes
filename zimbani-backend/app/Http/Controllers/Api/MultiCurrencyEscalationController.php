<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FxHedgingContract;
use App\Models\MaterialPriceIndex;
use App\Services\MultiCurrencyEscalationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MultiCurrencyEscalationController extends Controller
{
    protected MultiCurrencyEscalationService $service;

    public function __construct(MultiCurrencyEscalationService $service)
    {
        $this->service = $service;
    }

    /**
     * Get active FX exchange rates
     */
    public function getRates(): JsonResponse
    {
        $this->service->seedDefaultExchangeRates();
        $stats = $this->service->getStatistics();

        return response()->json([
            'success' => true,
            'data' => $stats['exchange_rates'],
        ]);
    }

    /**
     * Record a new spot exchange rate
     */
    public function recordRate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'base_currency' => 'required|string|size:3',
            'target_currency' => 'nullable|string|size:3',
            'spot_rate' => 'required|numeric|min:0.000001',
            'buy_rate' => 'nullable|numeric|min:0.000001',
            'sell_rate' => 'nullable|numeric|min:0.000001',
            'source' => 'nullable|string|max:50',
            'rate_date' => 'nullable|date',
        ]);

        $rate = $this->service->recordExchangeRate($validated, $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Exchange rate recorded successfully.',
            'data' => $rate,
        ]);
    }

    /**
     * Currency conversion calculator
     */
    public function convert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'from_currency' => 'required|string|size:3',
            'to_currency' => 'required|string|size:3',
            'rate_date' => 'nullable|date',
        ]);

        $result = $this->service->convertCurrency(
            (float) $validated['amount'],
            $validated['from_currency'],
            $validated['to_currency'],
            $validated['rate_date'] ?? null
        );

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * List diaspora forward FX hedging contracts
     */
    public function getHedgingContracts(Request $request): JsonResponse
    {
        $query = FxHedgingContract::with([
            'client:id,uuid,first_name,last_name,email,phone_number',
            'savingsAccount:id,uuid,account_number,current_balance',
            'milestoneSavingsPool:id,uuid,milestone_name,tier_order,allocated_amount,target_amount',
        ]);

        if ($request->query('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->query('base_currency')) {
            $query->where('base_currency', strtoupper($request->query('base_currency')));
        }
        if ($request->query('client_id')) {
            $query->where('client_id', $request->query('client_id'));
        }

        $contracts = $query->orderByDesc('created_at')->paginate((int) $request->query('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $contracts,
        ]);
    }

    /**
     * Create forward FX rate lock for client
     */
    public function createHedgingContract(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|integer|exists:clients,id',
            'savings_account_id' => 'nullable|integer|exists:savings_accounts,id',
            'milestone_savings_pool_id' => 'nullable|integer|exists:milestone_savings_pools,id',
            'base_currency' => 'required|string|size:3',
            'target_currency' => 'nullable|string|size:3',
            'committed_amount_foreign' => 'required|numeric|min:1',
            'locked_exchange_rate' => 'nullable|numeric|min:0.000001',
            'lock_duration_days' => 'nullable|integer|min:30|max:365',
            'premium_fee_percentage' => 'nullable|numeric|min:0|max:10',
            'notes' => 'nullable|string|max:500',
        ]);

        $contract = $this->service->createHedgingContract($validated, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Hedging Contract {$contract->contract_number} created successfully.",
            'data' => $contract,
        ], 201);
    }

    /**
     * Draw down foreign funds from hedging contract into construction savings pool
     */
    public function drawdownHedgingContract(Request $request, string $uuid): JsonResponse
    {
        $contract = FxHedgingContract::where('uuid', $uuid)->firstOrFail();

        $validated = $request->validate([
            'amount_foreign' => 'required|numeric|min:1',
            'notes' => 'nullable|string|max:500',
        ]);

        $result = $this->service->drawdownHedgingContract(
            $contract,
            (float) $validated['amount_foreign'],
            $validated['notes'] ?? null,
            $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => 'Hedging drawdown executed successfully.',
            'data' => $result,
        ]);
    }

    /**
     * List construction material price indices
     */
    public function getIndices(): JsonResponse
    {
        $this->service->seedDefaultMaterialIndex();
        $indices = MaterialPriceIndex::with('priceRecords')->where('is_active', true)->get();

        return response()->json([
            'success' => true,
            'data' => $indices,
        ]);
    }

    /**
     * Get specific index details with price records
     */
    public function getIndex(string $uuid): JsonResponse
    {
        $index = MaterialPriceIndex::with(['priceRecords', 'creator:id,name'])->where('uuid', $uuid)->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $index,
        ]);
    }

    /**
     * Record new spot price for material item in index basket
     */
    public function updateMaterialPrice(Request $request, string $uuid): JsonResponse
    {
        $index = MaterialPriceIndex::where('uuid', $uuid)->firstOrFail();

        $validated = $request->validate([
            'item_code' => 'required|string|max:50',
            'new_price' => 'required|numeric|min:1',
            'survey_source' => 'nullable|string|max:150',
        ]);

        $record = $this->service->recordMaterialPriceUpdate(
            $index,
            $validated['item_code'],
            (float) $validated['new_price'],
            $validated['survey_source'] ?? null,
            $request->user()
        );

        return response()->json([
            'success' => true,
            'message' => "Price updated for {$record->item_name}. Index is now {$index->fresh()->current_index_value}.",
            'data' => [
                'record' => $record,
                'index' => $index->fresh('priceRecords'),
            ],
        ]);
    }

    /**
     * Calculate BOQ Escalation Adjustment under FIDIC Clause 70
     */
    public function calculateBoqEscalation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'initial_boq_amount' => 'required|numeric|min:1000',
            'index_id' => 'nullable|integer|exists:material_price_indices,id',
        ]);

        $index = !empty($validated['index_id'])
            ? MaterialPriceIndex::findOrFail($validated['index_id'])
            : $this->service->seedDefaultMaterialIndex();

        $result = $this->service->calculateBoqEscalation(
            (float) $validated['initial_boq_amount'],
            $index
        );

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Overall multi-currency & escalation statistics
     */
    public function getStatistics(): JsonResponse
    {
        $stats = $this->service->getStatistics();

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
