<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSubcontractorContractRequest;
use App\Http\Requests\UpdateSubcontractorContractRequest;
use App\Http\Resources\SubcontractorContractResource;
use App\Models\Project;
use App\Models\Site;
use App\Models\SubcontractorContract;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class SubcontractorContractController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of subcontractor contracts.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', SubcontractorContract::class);

        $query = SubcontractorContract::with(['project', 'site', 'createdBy', 'paymentCertificates']);

        // Filter by project
        if ($request->filled('project_id')) {
            $projectId = $request->project_id;
            if (is_numeric($projectId)) {
                $query->where('project_id', $projectId);
            } else {
                $project = Project::where('uuid', $projectId)->first();
                if ($project) {
                    $query->where('project_id', $project->id);
                }
            }
        }

        // Filter by site
        if ($request->filled('site_id')) {
            $siteId = $request->site_id;
            if (is_numeric($siteId)) {
                $query->where('site_id', $siteId);
            } else {
                $site = Site::where('uuid', $siteId)->first();
                if ($site) {
                    $query->where('site_id', $site->id);
                }
            }
        }

        // Filter by trade category
        if ($request->filled('trade_category')) {
            $query->where('trade_category', $request->trade_category);
        }

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Search query
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('contract_number', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('subcontractor_name', 'like', "%{$search}%")
                  ->orWhere('subcontractor_phone', 'like', "%{$search}%")
                  ->orWhere('tax_identification_number', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = strtolower($request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        if (in_array($sortBy, ['created_at', 'contract_number', 'contract_sum', 'start_date', 'expected_completion_date', 'status'])) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 15)));
        $contracts = $query->paginate($perPage);

        return SubcontractorContractResource::collection($contracts);
    }

    /**
     * Store a newly created subcontractor contract.
     */
    public function store(StoreSubcontractorContractRequest $request): JsonResponse
    {
        $this->authorize('create', SubcontractorContract::class);

        $projectId = $request->getProjectId();
        $siteId = $request->getSiteId();

        if (!$projectId || !$siteId) {
            return response()->json([
                'message' => 'Invalid project or site specified.',
            ], 422);
        }

        $contract = SubcontractorContract::create([
            'project_id' => $projectId,
            'site_id' => $siteId,
            'title' => $request->title,
            'subcontractor_name' => $request->subcontractor_name,
            'subcontractor_contact_person' => $request->subcontractor_contact_person,
            'subcontractor_phone' => $request->subcontractor_phone,
            'subcontractor_email' => $request->subcontractor_email,
            'tax_identification_number' => $request->tax_identification_number,
            'trade_category' => $request->trade_category,
            'scope_of_work' => $request->scope_of_work,
            'contract_sum' => $request->contract_sum,
            'currency' => $request->currency ?? 'UGX',
            'retention_percentage' => $request->retention_percentage ?? 5.00,
            'start_date' => $request->start_date,
            'expected_completion_date' => $request->expected_completion_date,
            'payment_terms' => $request->payment_terms,
            'status' => 'draft',
            'notes' => $request->notes,
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => 'Subcontractor contract created successfully',
            'data' => new SubcontractorContractResource($contract->load(['project', 'site', 'createdBy'])),
        ], 201);
    }

    /**
     * Display the specified subcontractor contract.
     */
    public function show(SubcontractorContract $subcontractorContract): JsonResponse
    {
        $this->authorize('view', $subcontractorContract);

        $subcontractorContract->load([
            'project',
            'site',
            'signedBy',
            'approvedBy',
            'createdBy',
            'updatedBy',
            'paymentCertificates.siteManager',
            'paymentCertificates.financeOfficer',
            'paymentCertificates.admin',
            'paymentCertificates.paidBy',
            'documents',
        ]);

        return response()->json([
            'data' => new SubcontractorContractResource($subcontractorContract),
        ]);
    }

    /**
     * Update the specified subcontractor contract.
     */
    public function update(UpdateSubcontractorContractRequest $request, SubcontractorContract $subcontractorContract): JsonResponse
    {
        $this->authorize('update', $subcontractorContract);

        if (in_array($subcontractorContract->status, ['terminated', 'completed'])) {
            return response()->json([
                'message' => "Contracts with status '{$subcontractorContract->status}' cannot be modified.",
            ], 422);
        }

        $data = $request->only([
            'title',
            'subcontractor_name',
            'subcontractor_contact_person',
            'subcontractor_phone',
            'subcontractor_email',
            'tax_identification_number',
            'trade_category',
            'scope_of_work',
            'contract_sum',
            'currency',
            'retention_percentage',
            'start_date',
            'expected_completion_date',
            'payment_terms',
            'notes',
        ]);

        if ($request->has('project_id')) {
            $data['project_id'] = $request->getProjectId();
        }

        if ($request->has('site_id')) {
            $data['site_id'] = $request->getSiteId();
        }

        $data['updated_by'] = auth()->id();

        $subcontractorContract->update($data);

        return response()->json([
            'message' => 'Subcontractor contract updated successfully',
            'data' => new SubcontractorContractResource($subcontractorContract->fresh(['project', 'site', 'updatedBy'])),
        ]);
    }

    /**
     * Remove the specified subcontractor contract.
     */
    public function destroy(SubcontractorContract $subcontractorContract): JsonResponse
    {
        $this->authorize('delete', $subcontractorContract);

        // Disallow deletion if payment certificates exist
        if ($subcontractorContract->paymentCertificates()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete contract because payment certificates have already been generated for it. Terminate the contract instead.',
            ], 422);
        }

        $subcontractorContract->delete();

        return response()->json([
            'message' => 'Subcontractor contract deleted successfully',
        ]);
    }

    /**
     * Activate the subcontractor contract.
     */
    public function activate(Request $request, SubcontractorContract $subcontractorContract): JsonResponse
    {
        $this->authorize('update', $subcontractorContract);

        if (!in_array($subcontractorContract->status, ['draft', 'suspended'])) {
            return response()->json([
                'message' => "Contract in status '{$subcontractorContract->status}' cannot be activated.",
            ], 422);
        }

        $subcontractorContract->activate(auth()->user());

        return response()->json([
            'message' => 'Subcontractor contract activated successfully',
            'data' => new SubcontractorContractResource($subcontractorContract->fresh(['project', 'site', 'signedBy'])),
        ]);
    }

    /**
     * Suspend the subcontractor contract.
     */
    public function suspend(Request $request, SubcontractorContract $subcontractorContract): JsonResponse
    {
        $this->authorize('update', $subcontractorContract);

        if ($subcontractorContract->status !== 'active') {
            return response()->json([
                'message' => "Only active contracts can be suspended.",
            ], 422);
        }

        $request->validate(['notes' => 'nullable|string|max:1000']);
        $subcontractorContract->suspend($request->notes);

        return response()->json([
            'message' => 'Subcontractor contract suspended successfully',
            'data' => new SubcontractorContractResource($subcontractorContract->fresh(['project', 'site'])),
        ]);
    }

    /**
     * Terminate the subcontractor contract.
     */
    public function terminate(Request $request, SubcontractorContract $subcontractorContract): JsonResponse
    {
        $this->authorize('update', $subcontractorContract);

        if (in_array($subcontractorContract->status, ['completed', 'terminated'])) {
            return response()->json([
                'message' => "Contract is already {$subcontractorContract->status}.",
            ], 422);
        }

        $request->validate(['reason' => 'required|string|max:1000']);
        $subcontractorContract->terminate($request->reason);

        return response()->json([
            'message' => 'Subcontractor contract terminated successfully',
            'data' => new SubcontractorContractResource($subcontractorContract->fresh(['project', 'site'])),
        ]);
    }

    /**
     * Contract portfolio metrics and statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SubcontractorContract::class);

        $query = SubcontractorContract::query();

        if ($request->filled('project_id')) {
            $projectId = $request->project_id;
            if (is_numeric($projectId)) {
                $query->where('project_id', $projectId);
            } else {
                $project = Project::where('uuid', $projectId)->first();
                if ($project) {
                    $query->where('project_id', $project->id);
                }
            }
        }

        if ($request->filled('site_id')) {
            $siteId = $request->site_id;
            if (is_numeric($siteId)) {
                $query->where('site_id', $siteId);
            } else {
                $site = Site::where('uuid', $siteId)->first();
                if ($site) {
                    $query->where('site_id', $site->id);
                }
            }
        }

        $totalContracts = (clone $query)->count();
        $draftCount = (clone $query)->where('status', 'draft')->count();
        $activeCount = (clone $query)->where('status', 'active')->count();
        $completedCount = (clone $query)->where('status', 'completed')->count();
        $suspendedCount = (clone $query)->where('status', 'suspended')->count();
        $terminatedCount = (clone $query)->where('status', 'terminated')->count();

        $totalContractSum = (float) (clone $query)->sum('contract_sum');
        $totalRetentionBudgeted = (float) (clone $query)->sum('retention_amount');

        // Aggregated payments & certificates
        $allContracts = (clone $query)->with(['paymentCertificates'])->get();
        $totalCertifiedGross = $allContracts->sum(fn ($c) => $c->total_certified_gross);
        $totalRetentionHeld = $allContracts->sum(fn ($c) => $c->total_retention_held);
        $totalNetPayable = $allContracts->sum(fn ($c) => $c->total_net_payable);
        $totalPaid = $allContracts->sum(fn ($c) => $c->total_paid);

        return response()->json([
            'data' => [
                'total_contracts' => $totalContracts,
                'draft_count' => $draftCount,
                'active_count' => $activeCount,
                'completed_count' => $completedCount,
                'suspended_count' => $suspendedCount,
                'terminated_count' => $terminatedCount,
                'total_contract_sum' => $totalContractSum,
                'total_retention_budgeted' => $totalRetentionBudgeted,
                'total_certified_gross' => $totalCertifiedGross,
                'total_retention_held' => $totalRetentionHeld,
                'total_net_payable' => $totalNetPayable,
                'total_paid' => $totalPaid,
                'overall_balance_remaining' => max(0.0, $totalContractSum - $totalPaid),
            ],
        ]);
    }
}
