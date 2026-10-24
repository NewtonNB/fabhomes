<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MotherTitle;
use App\Models\MotherTitleTransfer;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MotherTitleController extends Controller
{
    /**
     * List mother titles with search & filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = MotherTitle::with('transfers');

        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('title_no', 'like', "%{$search}%")
                  ->orWhere('record_no', 'like', "%{$search}%")
                  ->orWhere('estate_name', 'like', "%{$search}%")
                  ->orWhere('district', 'like', "%{$search}%")
                  ->orWhere('village', 'like', "%{$search}%");
            });
        }

        if ($request->filled('phase')) {
            $query->where('phase', $request->get('phase'));
        }

        if ($request->filled('scheme')) {
            $query->where('scheme', $request->get('scheme'));
        }

        if ($request->filled('title_status')) {
            $query->where('title_status', $request->get('title_status'));
        }

        // Seed initial mother titles if empty
        if (MotherTitle::count() === 0) {
            MotherTitle::create([
                'record_no' => 'MT-0001',
                'phase' => 'Phase 1',
                'scheme' => 'Mukono',
                'title_no' => 'Kyaggwe Block 180 Plot 45',
                'block_no' => '180',
                'district' => 'Mukono',
                'sub_county' => 'Goma',
                'village' => 'Ntaawo',
                'estate_name' => 'Mukono Greenfield Heights',
                'area_acres' => 25.50,
                'subdivision_date' => '2023-03-10',
                'new_plot_no' => 'Plots 101 - 150',
                'title_status' => 'subdivided',
                'verified_by' => 'Eng. Patrick Musisi',
                'notes' => 'Subdivision into 50 residential plots 50x100ft.',
            ]);

            MotherTitle::create([
                'record_no' => 'MT-0002',
                'phase' => 'Phase 2',
                'scheme' => 'Wakiso',
                'title_no' => 'Busiro Block 340 Plot 12',
                'block_no' => '340',
                'district' => 'Wakiso',
                'sub_county' => 'Ssisa',
                'village' => 'Kajjansi',
                'estate_name' => 'Royal Palms Kajjansi',
                'area_acres' => 15.00,
                'subdivision_date' => '2023-09-18',
                'title_status' => 'in_safe',
                'verified_by' => 'Sarah Namatovu',
                'notes' => 'Original Mailo title in headquarters safe deposit.',
            ]);

            MotherTitle::create([
                'record_no' => 'MT-0003',
                'phase' => 'Phase 3',
                'scheme' => 'Jinja',
                'title_no' => 'Butembe Block 22 Plot 88',
                'block_no' => '22',
                'district' => 'Jinja',
                'sub_county' => 'Mafubira',
                'village' => 'Wakitaka',
                'estate_name' => 'Nile Vista Estate',
                'area_acres' => 30.00,
                'subdivision_date' => null,
                'title_status' => 'with_surveyor',
                'verified_by' => 'Denis Ssemwogerere',
                'notes' => 'Currently with Ministry Zonal Office for cadastral mutation.',
            ]);
        }

        $perPage = (int) $request->get('per_page', 15);
        $titles = $query->latest()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $titles->items(),
            'meta' => [
                'current_page' => $titles->currentPage(),
                'last_page' => $titles->lastPage(),
                'per_page' => $titles->perPage(),
                'total' => $titles->total(),
            ],
        ]);
    }

    /**
     * Store new mother title.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phase' => 'required|string|max:50',
            'scheme' => 'required|string|max:100',
            'title_no' => 'required|string|max:150',
            'block_no' => 'nullable|string|max:50',
            'district' => 'required|string|max:100',
            'sub_county' => 'nullable|string|max:100',
            'village' => 'nullable|string|max:100',
            'estate_name' => 'required|string|max:150',
            'area_acres' => 'required|numeric|min:0.01',
            'subdivision_date' => 'nullable|date',
            'date_of_return' => 'nullable|date',
            'new_plot_no' => 'nullable|string|max:100',
            'title_status' => 'nullable|in:in_safe,with_surveyor,at_ministry,subdivided,transferred',
            'verified_by' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:1000',
        ]);

        $motherTitle = MotherTitle::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Mother title deed registered successfully.',
            'data' => $motherTitle,
        ], 201);
    }

    /**
     * Show single mother title.
     */
    public function show(string $identifier): JsonResponse
    {
        $title = MotherTitle::with('transfers')
            ->where('id', $identifier)
            ->orWhere('uuid', $identifier)
            ->orWhere('record_no', $identifier)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $title,
        ]);
    }

    /**
     * Update mother title.
     */
    public function update(Request $request, string $identifier): JsonResponse
    {
        $title = MotherTitle::where('id', $identifier)
            ->orWhere('uuid', $identifier)
            ->firstOrFail();

        $validated = $request->validate([
            'phase' => 'sometimes|string|max:50',
            'scheme' => 'sometimes|string|max:100',
            'title_no' => 'sometimes|string|max:150',
            'block_no' => 'sometimes|nullable|string|max:50',
            'district' => 'sometimes|string|max:100',
            'sub_county' => 'sometimes|nullable|string|max:100',
            'village' => 'sometimes|nullable|string|max:100',
            'estate_name' => 'sometimes|string|max:150',
            'area_acres' => 'sometimes|numeric|min:0.01',
            'subdivision_date' => 'sometimes|nullable|date',
            'date_of_return' => 'sometimes|nullable|date',
            'new_plot_no' => 'sometimes|nullable|string|max:100',
            'title_status' => 'sometimes|in:in_safe,with_surveyor,at_ministry,subdivided,transferred',
            'verified_by' => 'sometimes|nullable|string|max:100',
            'notes' => 'sometimes|nullable|string|max:1000',
        ]);

        $title->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Mother title updated successfully.',
            'data' => $title->fresh()->load('transfers'),
        ]);
    }

    /**
     * Delete mother title.
     */
    public function destroy(string $identifier): JsonResponse
    {
        $title = MotherTitle::where('id', $identifier)
            ->orWhere('uuid', $identifier)
            ->firstOrFail();

        $title->delete();

        return response()->json([
            'success' => true,
            'message' => 'Mother title archived.',
        ]);
    }

    /**
     * Record mother title transfer / checkout.
     */
    public function recordTransfer(Request $request, string $identifier): JsonResponse
    {
        $title = MotherTitle::where('id', $identifier)
            ->orWhere('uuid', $identifier)
            ->firstOrFail();

        $validated = $request->validate([
            'date_taken' => 'required|date',
            'date_of_return' => 'nullable|date|after_or_equal:date_taken',
            'verified_by' => 'required|string|max:100',
            'purpose' => 'required|string|max:255',
            'remarks' => 'nullable|string|max:500',
        ]);

        $transfer = $title->transfers()->create($validated);

        // Update mother title status
        $title->update([
            'title_status' => 'with_surveyor',
            'date_of_return' => $validated['date_of_return'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Mother title transfer recorded successfully.',
            'data' => $transfer,
        ], 201);
    }

    /**
     * Mark transfer returned.
     */
    public function returnTransfer(Request $request, string $transferId): JsonResponse
    {
        $transfer = MotherTitleTransfer::with('motherTitle')
            ->where('id', $transferId)
            ->orWhere('uuid', $transferId)
            ->firstOrFail();

        $transfer->status = 'returned';
        $transfer->date_of_return = now()->toDateString();
        $transfer->save();

        $transfer->motherTitle->update([
            'title_status' => 'in_safe',
            'date_of_return' => now()->toDateString(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Mother title marked returned to vault safe.',
            'data' => $transfer,
        ]);
    }

    /**
     * Subdivisions list (plots subdivided from estates/schemes).
     */
    public function subdivisions(Request $request): JsonResponse
    {
        $query = Unit::with(['site.project', 'client']);

        if ($request->filled('estate') || $request->filled('site_id')) {
            $val = $request->get('estate') ?? $request->get('site_id');
            $query->where('site_id', $val);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->get('status'));
        }

        $perPage = (int) $request->get('per_page', 20);
        $units = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $units->items(),
            'meta' => [
                'current_page' => $units->currentPage(),
                'last_page' => $units->lastPage(),
                'per_page' => $units->perPage(),
                'total' => $units->total(),
            ],
        ]);
    }
}
