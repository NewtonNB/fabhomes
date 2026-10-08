<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUnitRequest;
use App\Http\Requests\UpdateUnitRequest;
use App\Http\Resources\UnitResource;
use App\Models\Unit;
use App\Traits\LogsActivity;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class UnitController extends Controller
{
    use AuthorizesRequests, LogsActivity;

    /**
     * Display a listing of units.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Unit::class);

        $query = Unit::query();

        // Apply filters based on user role
        $user = $request->user();
        if (!$user->hasRole('Super Admin')) {
            if ($user->hasRole('Company Admin')) {
                // Company Admin sees only units in their company's projects
                $query->whereHas('project', function ($q) use ($user) {
                    $q->where('company_id', $user->company_id);
                });
            } elseif ($user->hasRole('Site Manager')) {
                // Site Manager sees units in assigned projects
                $query->whereHas('project.users', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            } elseif ($user->hasRole('Supervisor')) {
                // Supervisor sees units at sites they supervise or are assigned to
                $query->whereHas('site', function ($q) use ($user) {
                    $q->where('supervisor_id', $user->id)
                        ->orWhereHas('workers', function ($wq) use ($user) {
                            $wq->where('user_id', $user->id);
                        });
                });
            } elseif ($user->hasRole('Client')) {
                // Client sees their own units or available units in their company
                $query->where(function ($q) use ($user) {
                    $q->where('client_id', $user->id)
                        ->orWhere(function ($sq) use ($user) {
                            $sq->where('status', 'available')
                                ->whereHas('project', function ($pq) use ($user) {
                                    $pq->where('company_id', $user->company_id);
                                });
                        });
                });
            }
        }

        // Filter by site
        if ($request->has('site_id')) {
            $query->where('site_id', $request->site_id);
        }

        // Filter by project
        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by unit type
        if ($request->has('unit_type')) {
            $query->where('unit_type', $request->unit_type);
        }

        // Filter by availability
        if ($request->boolean('available_only')) {
            $query->available();
        }

        // Filter by sold units
        if ($request->boolean('sold_only')) {
            $query->sold();
        }

        // Filter by completed units
        if ($request->boolean('completed_only')) {
            $query->completed();
        }

        // Filter by overdue units
        if ($request->boolean('overdue_only')) {
            $query->overdue();
        }

        // Filter by client
        if ($request->has('client_id')) {
            $query->where('client_id', $request->client_id);
        }

        // Filter by bedrooms
        if ($request->has('bedrooms')) {
            $query->where('bedrooms', $request->bedrooms);
        }

        // Filter by price range
        if ($request->has('min_price') && $request->has('max_price')) {
            $query->inPriceRange($request->min_price, $request->max_price);
        } elseif ($request->has('min_price')) {
            $query->where('current_price', '>=', $request->min_price);
        } elseif ($request->has('max_price')) {
            $query->where('current_price', '<=', $request->max_price);
        }

        // Search by unit number or name
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('unit_number', 'like', '%' . $search . '%')
                    ->orWhere('name', 'like', '%' . $search . '%')
                    ->orWhere('block_number', 'like', '%' . $search . '%');
            });
        }

        // Include relationships
        $with = [];
        if ($request->boolean('with_site')) {
            $with[] = 'site';
        }
        if ($request->boolean('with_project')) {
            $with[] = 'project';
        }
        if ($request->boolean('with_client')) {
            $with[] = 'client';
        }

        if (!empty($with)) {
            $query->with($with);
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->input('per_page', 15);
        $units = $query->paginate($perPage);

        return UnitResource::collection($units);
    }

    /**
     * Store a newly created unit.
     *
     * @param  \App\Http\Requests\StoreUnitRequest  $request
     * @return \Illuminate\Http\Response
     */
    public function store(StoreUnitRequest $request)
    {
        $this->authorize('create', Unit::class);

        $unit = Unit::create($request->validated());

        $this->logCreated($unit);

        return new UnitResource($unit->load('site', 'project'));
    }

    /**
     * Display the specified unit.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Unit  $unit
     * @return \Illuminate\Http\Response
     */
    public function show(Request $request, Unit $unit)
    {
        $this->authorize('view', $unit);

        $with = ['site', 'project'];
        
        if ($request->boolean('with_client')) {
            $with[] = 'client';
        }

        $unit->load($with);

        return new UnitResource($unit);
    }

    /**
     * Update the specified unit.
     *
     * @param  \App\Http\Requests\UpdateUnitRequest  $request
     * @param  \App\Models\Unit  $unit
     * @return \Illuminate\Http\Response
     */
    public function update(UpdateUnitRequest $request, Unit $unit)
    {
        $this->authorize('update', $unit);

        $unit->update($request->validated());

        $this->logUpdated($unit);

        return new UnitResource($unit->load('site', 'project'));
    }

    /**
     * Remove the specified unit (soft delete).
     *
     * @param  \App\Models\Unit  $unit
     * @return \Illuminate\Http\Response
     */
    public function destroy(Unit $unit)
    {
        $this->authorize('delete', $unit);

        // Prevent deletion if unit is sold or has a client
        if ($unit->status === 'sold' || $unit->client_id) {
            return response()->json([
                'message' => 'Cannot delete a unit that is sold or has a client assigned.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $unit->delete();

        $this->logDeleted($unit);

        return response()->json([
            'message' => 'Unit deleted successfully.',
        ]);
    }

    /**
     * Restore a soft-deleted unit.
     *
     * @param  string  $uuid
     * @return \Illuminate\Http\Response
     */
    public function restore($uuid)
    {
        $unit = Unit::withTrashed()->where('uuid', $uuid)->firstOrFail();

        $this->authorize('restore', $unit);

        $unit->restore();

        $this->logRestored($unit);

        return new UnitResource($unit->load('site', 'project'));
    }

    /**
     * Get unit statistics.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function statistics(Request $request)
    {
        $this->authorize('viewAny', Unit::class);

        $query = Unit::query();

        // Apply role-based filters
        $user = $request->user();
        if (!$user->hasRole('Super Admin')) {
            if ($user->hasRole('Company Admin')) {
                $query->whereHas('project', function ($q) use ($user) {
                    $q->where('company_id', $user->company_id);
                });
            } elseif ($user->hasRole('Site Manager')) {
                $query->whereHas('project.users', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            } elseif ($user->hasRole('Supervisor')) {
                $query->whereHas('site', function ($q) use ($user) {
                    $q->where('supervisor_id', $user->id)
                        ->orWhereHas('workers', function ($wq) use ($user) {
                            $wq->where('user_id', $user->id);
                        });
                });
            }
        }

        // Filter by site or project if specified
        if ($request->has('site_id')) {
            $query->where('site_id', $request->site_id);
        }

        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        $statistics = [
            'total_units' => $query->count(),
            'available_units' => (clone $query)->where('status', 'available')->count(),
            'reserved_units' => (clone $query)->where('status', 'reserved')->count(),
            'sold_units' => (clone $query)->where('status', 'sold')->count(),
            'occupied_units' => (clone $query)->where('status', 'occupied')->count(),
            'under_construction' => (clone $query)->where('status', 'under_construction')->count(),
            'completed_units' => (clone $query)->completed()->count(),
            'overdue_units' => (clone $query)->overdue()->count(),
            'by_type' => (clone $query)
                ->select('unit_type', DB::raw('count(*) as count'))
                ->groupBy('unit_type')
                ->pluck('count', 'unit_type'),
            'by_status' => (clone $query)
                ->select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->pluck('count', 'status'),
            'by_bedrooms' => (clone $query)
                ->whereNotNull('bedrooms')
                ->select('bedrooms', DB::raw('count(*) as count'))
                ->groupBy('bedrooms')
                ->orderBy('bedrooms')
                ->pluck('count', 'bedrooms'),
            'pricing' => [
                'average_price' => (clone $query)->whereNotNull('current_price')->avg('current_price'),
                'min_price' => (clone $query)->whereNotNull('current_price')->min('current_price'),
                'max_price' => (clone $query)->whereNotNull('current_price')->max('current_price'),
                'total_inventory_value' => (clone $query)->sum('current_price'),
            ],
            'financial' => [
                'total_sales_value' => (clone $query)->where('status', 'sold')->sum('current_price'),
                'total_amount_paid' => (clone $query)->sum('amount_paid'),
                'total_balance_outstanding' => (clone $query)->sum('balance'),
            ],
            'construction' => [
                'average_completion' => (clone $query)->avg('completion_percentage'),
                'fully_completed' => (clone $query)->where('completion_percentage', 100)->count(),
            ],
        ];

        return response()->json($statistics);
    }

    /**
     * Reserve a unit for a client.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Unit  $unit
     * @return \Illuminate\Http\Response
     */
    public function reserve(Request $request, Unit $unit)
    {
        $this->authorize('reserve', $unit);

        // Validate that unit is available
        if ($unit->status !== 'available') {
            return response()->json([
                'message' => 'Unit is not available for reservation.',
                'current_status' => $unit->status,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $request->validate([
            'client_id' => 'required|exists:users,id',
            'reservation_notes' => 'nullable|string|max:1000',
        ]);

        // Convert client_id UUID to integer if needed
        if (!is_numeric($validated['client_id'])) {
            $client = \App\Models\User::where('uuid', $validated['client_id'])->first();
            if ($client) {
                $validated['client_id'] = $client->id;
            }
        }

        $unit->update([
            'status' => 'reserved',
            'client_id' => $validated['client_id'],
            'reserved_date' => now(),
        ]);

        $this->logActivity(
            'reserved',
            "Reserved Unit: {$unit->unit_number} for client",
            $unit,
            ['client_id' => $validated['client_id'], 'notes' => $validated['reservation_notes'] ?? null]
        );

        return new UnitResource($unit->load('site', 'project', 'client'));
    }

    /**
     * Mark a unit as sold.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Unit  $unit
     * @return \Illuminate\Http\Response
     */
    public function sell(Request $request, Unit $unit)
    {
        $this->authorize('sell', $unit);

        $validated = $request->validate([
            'client_id' => 'required|exists:users,id',
            'sale_price' => 'required|numeric|min:0',
            'amount_paid' => 'nullable|numeric|min:0',
            'sale_notes' => 'nullable|string|max:1000',
        ]);

        // Convert client_id UUID to integer if needed
        if (!is_numeric($validated['client_id'])) {
            $client = \App\Models\User::where('uuid', $validated['client_id'])->first();
            if ($client) {
                $validated['client_id'] = $client->id;
            }
        }

        $amountPaid = $validated['amount_paid'] ?? 0;

        $unit->update([
            'status' => 'sold',
            'client_id' => $validated['client_id'],
            'current_price' => $validated['sale_price'],
            'amount_paid' => $amountPaid,
            'balance' => $validated['sale_price'] - $amountPaid,
            'sold_date' => now(),
        ]);

        $this->logActivity(
            'sold',
            "Sold Unit: {$unit->unit_number}",
            $unit,
            [
                'client_id' => $validated['client_id'],
                'sale_price' => $validated['sale_price'],
                'amount_paid' => $amountPaid,
                'notes' => $validated['sale_notes'] ?? null
            ]
        );

        return new UnitResource($unit->load('site', 'project', 'client'));
    }

    /**
     * Update construction progress for a unit.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Unit  $unit
     * @return \Illuminate\Http\Response
     */
    public function updateProgress(Request $request, Unit $unit)
    {
        $this->authorize('updateProgress', $unit);

        $validated = $request->validate([
            'completion_percentage' => 'required|integer|min:0|max:100',
            'progress_notes' => 'nullable|string|max:1000',
        ]);

        $oldPercentage = $unit->completion_percentage;

        $unit->update([
            'completion_percentage' => $validated['completion_percentage'],
        ]);

        // If 100% complete, update status and actual completion date
        if ($validated['completion_percentage'] >= 100 && !$unit->actual_completion_date) {
            $unit->update([
                'status' => 'completed',
                'actual_completion_date' => now(),
            ]);
        }

        $this->logActivity(
            'progress_updated',
            "Updated construction progress for Unit: {$unit->unit_number}",
            $unit,
            [
                'old_percentage' => $oldPercentage,
                'new_percentage' => $validated['completion_percentage'],
                'notes' => $validated['progress_notes'] ?? null
            ]
        );

        return new UnitResource($unit);
    }

    /**
     * Update unit inspection.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Unit  $unit
     * @return \Illuminate\Http\Response
     */
    public function updateInspection(Request $request, Unit $unit)
    {
        $this->authorize('conductInspection', $unit);

        $validated = $request->validate([
            'last_inspection_date' => 'nullable|date|before_or_equal:today',
            'next_inspection_date' => 'nullable|date|after:last_inspection_date',
            'inspection_notes' => 'nullable|string|max:2000',
            'is_defect_free' => 'nullable|boolean',
        ]);

        $unit->update([
            'last_inspection_date' => $validated['last_inspection_date'] ?? now(),
            'next_inspection_date' => $validated['next_inspection_date'] ?? null,
            'inspection_notes' => $validated['inspection_notes'] ?? $unit->inspection_notes,
            'is_defect_free' => $validated['is_defect_free'] ?? $unit->is_defect_free,
        ]);

        $this->logActivity(
            'inspection_updated',
            "Updated inspection for Unit: {$unit->unit_number}",
            $unit,
            ['notes' => $validated['inspection_notes'] ?? null]
        );

        return new UnitResource($unit);
    }

    /**
     * Update unit payment information.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Unit  $unit
     * @return \Illuminate\Http\Response
     */
    public function updatePayment(Request $request, Unit $unit)
    {
        $this->authorize('updatePayments', $unit);

        $validated = $request->validate([
            'amount_paid' => 'required|numeric|min:0',
            'payment_notes' => 'nullable|string|max:1000',
        ]);

        $oldAmountPaid = $unit->amount_paid;
        $newBalance = $unit->current_price - $validated['amount_paid'];

        $unit->update([
            'amount_paid' => $validated['amount_paid'],
            'balance' => $newBalance,
        ]);

        $this->logActivity(
            'payment_updated',
            "Updated payment for Unit: {$unit->unit_number}",
            $unit,
            [
                'old_amount_paid' => $oldAmountPaid,
                'new_amount_paid' => $validated['amount_paid'],
                'balance' => $newBalance,
                'notes' => $validated['payment_notes'] ?? null
            ]
        );

        return new UnitResource($unit);
    }
}
