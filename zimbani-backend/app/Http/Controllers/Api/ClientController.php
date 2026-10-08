<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Http\Resources\ClientResource;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ClientController extends Controller
{
    /**
     * Display a listing of clients
     */
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Client::class);

        $query = Client::query();

        // Search
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by KYC status
        if ($request->filled('kyc_status')) {
            $query->where('kyc_status', $request->kyc_status);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        $query->orderBy($sortBy, $sortDirection);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $clients = $query->paginate($perPage);

        return ClientResource::collection($clients);
    }

    /**
     * Store a newly created client
     */
    public function store(StoreClientRequest $request)
    {
        $data = $request->validated();
        $data['created_by'] = auth()->id();

        $client = Client::create($data);

        return new ClientResource($client);
    }

    /**
     * Display the specified client
     */
    public function show(Request $request, Client $client)
    {
        Gate::authorize('view', $client);

        // Load relationships if requested
        if ($request->boolean('with_units')) {
            $client->load('units');
        }
        if ($request->boolean('with_user')) {
            $client->load('user');
        }

        return new ClientResource($client);
    }

    /**
     * Update the specified client
     */
    public function update(UpdateClientRequest $request, Client $client)
    {
        $data = $request->validated();
        $data['updated_by'] = auth()->id();

        $client->update($data);

        return new ClientResource($client->fresh());
    }

    /**
     * Remove the specified client (soft delete)
     */
    public function destroy(Client $client)
    {
        Gate::authorize('delete', $client);

        $client->delete();

        return response()->json([
            'success' => true,
            'message' => 'Client deleted successfully',
        ]);
    }

    /**
     * Restore a soft-deleted client
     */
    public function restore(string $uuid)
    {
        $client = Client::withTrashed()->where('uuid', $uuid)->firstOrFail();
        
        Gate::authorize('restore', $client);

        $client->restore();

        return new ClientResource($client);
    }

    /**
     * Get client's units
     */
    public function units(Request $request, Client $client)
    {
        Gate::authorize('view', $client);

        $perPage = $request->get('per_page', 15);
        $units = $client->units()->paginate($perPage);

        return response()->json($units);
    }

    /**
     * Verify client KYC
     */
    public function verifyKyc(Client $client)
    {
        Gate::authorize('verifyKyc', $client);

        $client->verifyKyc(auth()->user());

        return new ClientResource($client->fresh());
    }

    /**
     * Reject client KYC
     */
    public function rejectKyc(Client $client)
    {
        Gate::authorize('verifyKyc', $client);

        $client->rejectKyc();

        return new ClientResource($client->fresh());
    }

    /**
     * Get client statistics
     */
    public function statistics(Request $request)
    {
        Gate::authorize('viewAny', Client::class);

        $stats = [
            'total_clients' => Client::count(),
            'active_clients' => Client::where('status', 'active')->count(),
            'inactive_clients' => Client::where('status', 'inactive')->count(),
            'suspended_clients' => Client::where('status', 'suspended')->count(),
            'kyc_verified' => Client::where('kyc_status', 'verified')->count(),
            'kyc_pending' => Client::where('kyc_status', 'pending')->count(),
            'kyc_rejected' => Client::where('kyc_status', 'rejected')->count(),
            'recent_clients' => ClientResource::collection(
                Client::latest()->limit(5)->get()
            ),
        ];

        return response()->json($stats);
    }
}
