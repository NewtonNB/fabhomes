<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCompanyRequest;
use App\Http\Requests\UpdateCompanyRequest;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Traits\LogsActivity;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CompanyController extends Controller
{
    use AuthorizesRequests, LogsActivity;

    /**
     * Display a listing of companies.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', Company::class);

        $query = Company::query();

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by company type
        if ($request->has('company_type')) {
            $query->where('company_type', $request->company_type);
        }

        // Filter by parent companies only
        if ($request->boolean('parent_only')) {
            $query->parentCompanies();
        }

        // Search by name
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Include relationships
        $with = [];
        if ($request->boolean('with_parent')) {
            $with[] = 'parentCompany';
        }
        if ($request->boolean('with_subsidiaries')) {
            $with[] = 'subsidiaries';
        }
        if ($request->boolean('with_users_count')) {
            $query->withCount('users');
        }

        if (!empty($with)) {
            $query->with($with);
        }

        // Sort
        $sortField = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_direction', 'desc');
        $query->orderBy($sortField, $sortDirection);

        // Paginate
        $perPage = $request->get('per_page', 15);
        $companies = $query->paginate($perPage);

        return CompanyResource::collection($companies);
    }

    /**
     * Store a newly created company.
     *
     * @param  \App\Http\Requests\StoreCompanyRequest  $request
     * @return \Illuminate\Http\Response
     */
    public function store(StoreCompanyRequest $request)
    {
        $company = Company::create($request->validated());

        // Log activity
        $this->logCreated($company, [
            'company_name' => $company->name,
            'company_type' => $company->company_type,
        ]);

        return (new CompanyResource($company))
            ->additional([
                'message' => 'Company created successfully',
            ])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Display the specified company.
     *
     * @param  \App\Models\Company  $company
     * @return \Illuminate\Http\Response
     */
    public function show(Request $request, Company $company)
    {
        $this->authorize('view', $company);

        // Load relationships if requested
        if ($request->boolean('with_parent')) {
            $company->load('parentCompany');
        }
        if ($request->boolean('with_subsidiaries')) {
            $company->load('subsidiaries');
        }
        if ($request->boolean('with_users')) {
            $company->load('users');
        }

        return new CompanyResource($company);
    }

    /**
     * Update the specified company.
     *
     * @param  \App\Http\Requests\UpdateCompanyRequest  $request
     * @param  \App\Models\Company  $company
     * @return \Illuminate\Http\Response
     */
    public function update(UpdateCompanyRequest $request, Company $company)
    {
        $oldData = $company->only(['name', 'status', 'company_type']);
        
        $company->update($request->validated());

        // Log activity
        $this->logUpdated($company, $oldData, $company->only(['name', 'status', 'company_type']));

        return (new CompanyResource($company))
            ->additional([
                'message' => 'Company updated successfully',
            ]);
    }

    /**
     * Remove the specified company (soft delete).
     *
     * @param  \App\Models\Company  $company
     * @return \Illuminate\Http\Response
     */
    public function destroy(Company $company)
    {
        $this->authorize('delete', $company);

        // Check if company has subsidiaries
        if ($company->hasSubsidiaries()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete company with active subsidiaries',
            ], 422);
        }

        // Check if company has users
        if ($company->users()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete company with associated users',
            ], 422);
        }

        $companyName = $company->name;
        $company->delete();

        // Log activity
        $this->logDeleted($company, [
            'company_name' => $companyName,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Company deleted successfully',
        ]);
    }

    /**
     * Restore a soft-deleted company.
     *
     * @param  string  $uuid
     * @return \Illuminate\Http\Response
     */
    public function restore($uuid)
    {
        $company = Company::withTrashed()->where('uuid', $uuid)->firstOrFail();
        
        $this->authorize('restore', $company);

        $company->restore();

        // Log activity
        $this->logRestored($company, [
            'company_name' => $company->name,
        ]);

        return (new CompanyResource($company))
            ->additional([
                'message' => 'Company restored successfully',
            ]);
    }

    /**
     * Get company statistics.
     *
     * @return \Illuminate\Http\Response
     */
    public function statistics()
    {
        $this->authorize('viewAny', Company::class);

        $stats = [
            'total_companies' => Company::count(),
            'active_companies' => Company::where('status', 'active')->count(),
            'inactive_companies' => Company::where('status', 'inactive')->count(),
            'parent_companies' => Company::parentCompanies()->count(),
            'subsidiaries' => Company::whereNotNull('parent_company_id')->count(),
            'by_type' => Company::select('company_type')
                ->selectRaw('count(*) as count')
                ->groupBy('company_type')
                ->get()
                ->pluck('count', 'company_type'),
            'recent_companies' => Company::orderBy('created_at', 'desc')
                ->limit(5)
                ->get(['uuid', 'name', 'created_at']),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Get subsidiaries of a company.
     *
     * @param  \App\Models\Company  $company
     * @return \Illuminate\Http\Response
     */
    public function subsidiaries(Company $company)
    {
        $this->authorize('view', $company);

        $subsidiaries = $company->subsidiaries()
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return CompanyResource::collection($subsidiaries);
    }

    /**
     * Get users associated with a company.
     *
     * @param  \App\Models\Company  $company
     * @return \Illuminate\Http\Response
     */
    public function users(Company $company)
    {
        $this->authorize('view', $company);

        $users = $company->users()
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }
}
