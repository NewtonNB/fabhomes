<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApproveExpenseClaimRequest;
use App\Http\Requests\ReimburseExpenseClaimRequest;
use App\Http\Requests\StoreExpenseClaimRequest;
use App\Http\Requests\UpdateExpenseClaimRequest;
use App\Http\Requests\VerifyExpenseClaimRequest;
use App\Http\Resources\ExpenseClaimResource;
use App\Models\ExpenseClaim;
use App\Models\ExpenseItem;
use App\Models\PettyCashAccount;
use App\Models\Project;
use App\Models\Site;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class ExpenseClaimController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a paginated listing of expense claims.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', ExpenseClaim::class);

        $query = ExpenseClaim::with([
            'claimant',
            'pettyCashAccount',
            'project',
            'site',
            'items',
            'siteManager',
            'financeOfficer',
            'admin',
            'paidBy',
        ]);

        // Claimant scope: standard users see their own claims unless elevated
        if (!$request->user()->hasAnyRole(['Super Admin', 'Company Admin', 'Finance Officer', 'Site Manager'])) {
            $query->where('claimant_id', $request->user()->id);
        } elseif ($request->filled('claimant_id')) {
            $claimantId = $request->claimant_id;
            if (is_numeric($claimantId)) {
                $query->where('claimant_id', $claimantId);
            } else {
                $user = User::where('uuid', $claimantId)->first();
                if ($user) $query->where('claimant_id', $user->id);
            }
        }

        // Project filter
        if ($request->filled('project_id')) {
            $projectId = $request->project_id;
            if (is_numeric($projectId)) {
                $query->where('project_id', $projectId);
            } else {
                $project = Project::where('uuid', $projectId)->first();
                if ($project) $query->where('project_id', $project->id);
            }
        }

        // Site filter
        if ($request->filled('site_id')) {
            $siteId = $request->site_id;
            if (is_numeric($siteId)) {
                $query->where('site_id', $siteId);
            } else {
                $site = Site::where('uuid', $siteId)->first();
                if ($site) $query->where('site_id', $site->id);
            }
        }

        // Petty Cash Float filter
        if ($request->filled('petty_cash_account_id')) {
            $floatId = $request->petty_cash_account_id;
            if (is_numeric($floatId)) {
                $query->where('petty_cash_account_id', $floatId);
            } else {
                $float = PettyCashAccount::where('uuid', $floatId)->first();
                if ($float) $query->where('petty_cash_account_id', $float->id);
            }
        }

        // Status filter
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Category filter
        if ($request->filled('expense_category')) {
            $query->where('expense_category', $request->expense_category);
        }

        // Claim Type filter
        if ($request->filled('claim_type')) {
            $query->where('claim_type', $request->claim_type);
        }

        // Payment Method filter
        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        // Date range filters
        if ($request->filled('date_from')) {
            $query->whereDate('expense_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('expense_date', '<=', $request->date_to);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('claim_number', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('vendor_name', 'like', "%{$search}%")
                  ->orWhere('receipt_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('claimant', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = strtolower($request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        if (in_array($sortBy, ['created_at', 'claim_number', 'expense_date', 'total_amount', 'status'])) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 15)));
        $claims = $query->paginate($perPage);

        return ExpenseClaimResource::collection($claims);
    }

    /**
     * Store a newly created expense claim.
     */
    public function store(StoreExpenseClaimRequest $request): JsonResponse
    {
        $this->authorize('create', ExpenseClaim::class);

        return DB::transaction(function () use ($request) {
            $claimantId = auth()->id();
            if ($request->filled('claimant_id') && auth()->user()->hasAnyRole(['Super Admin', 'Company Admin', 'Finance Officer'])) {
                $id = $request->claimant_id;
                $user = is_numeric($id) ? User::find($id) : User::where('uuid', $id)->first();
                if ($user) $claimantId = $user->id;
            }

            $claim = ExpenseClaim::create([
                'claimant_id' => $claimantId,
                'petty_cash_account_id' => $request->getPettyCashAccountId(),
                'project_id' => $request->getProjectId(),
                'site_id' => $request->getSiteId(),
                'claim_type' => $request->claim_type,
                'expense_category' => $request->expense_category,
                'title' => $request->title,
                'expense_date' => $request->expense_date,
                'total_amount' => $request->total_amount,
                'currency' => $request->currency ?? 'UGX',
                'payment_method' => $request->payment_method,
                'vendor_name' => $request->vendor_name,
                'vendor_tin' => $request->vendor_tin,
                'receipt_number' => $request->receipt_number,
                'description' => $request->description,
                'status' => 'draft',
                'created_by' => auth()->id(),
            ]);

            // Add line items if provided
            if ($request->filled('items') && is_array($request->items)) {
                foreach ($request->items as $itemData) {
                    $claim->items()->create([
                        'item_description' => $itemData['item_description'],
                        'expense_category' => $itemData['expense_category'] ?? $claim->expense_category,
                        'quantity' => $itemData['quantity'] ?? 1.00,
                        'unit_of_measure' => $itemData['unit_of_measure'] ?? null,
                        'unit_price' => $itemData['unit_price'] ?? 0.00,
                        'receipt_reference' => $itemData['receipt_reference'] ?? null,
                    ]);
                }
                $claim->recalculateTotal();
            }

            return response()->json([
                'message' => 'Expense claim created successfully',
                'data' => new ExpenseClaimResource($claim->load(['claimant', 'pettyCashAccount', 'project', 'site', 'items'])),
            ], 201);
        });
    }

    /**
     * Display the specified expense claim.
     */
    public function show(ExpenseClaim $expenseClaim): JsonResponse
    {
        $this->authorize('view', $expenseClaim);

        $expenseClaim->load([
            'claimant',
            'pettyCashAccount',
            'project',
            'site',
            'items',
            'siteManager',
            'financeOfficer',
            'admin',
            'paidBy',
            'createdBy',
            'updatedBy',
            'documents',
        ]);

        return response()->json([
            'data' => new ExpenseClaimResource($expenseClaim),
        ]);
    }

    /**
     * Update the specified expense claim.
     */
    public function update(UpdateExpenseClaimRequest $request, ExpenseClaim $expenseClaim): JsonResponse
    {
        $this->authorize('update', $expenseClaim);

        if (!in_array($expenseClaim->status, ['draft', 'rejected'])) {
            return response()->json([
                'message' => "Only draft or rejected expense claims can be modified.",
            ], 422);
        }

        return DB::transaction(function () use ($request, $expenseClaim) {
            $data = $request->only([
                'title',
                'claim_type',
                'expense_category',
                'expense_date',
                'total_amount',
                'currency',
                'payment_method',
                'vendor_name',
                'vendor_tin',
                'receipt_number',
                'description',
            ]);

            if ($request->has('project_id')) $data['project_id'] = $request->getProjectId();
            if ($request->has('site_id')) $data['site_id'] = $request->getSiteId();
            if ($request->has('petty_cash_account_id')) $data['petty_cash_account_id'] = $request->getPettyCashAccountId();

            // Re-open rejected claim to draft on update
            if ($expenseClaim->status === 'rejected') {
                $data['status'] = 'draft';
            }

            $data['updated_by'] = auth()->id();
            $expenseClaim->update($data);

            // Update line items if passed
            if ($request->has('items') && is_array($request->items)) {
                $expenseClaim->items()->delete();
                foreach ($request->items as $itemData) {
                    $expenseClaim->items()->create([
                        'item_description' => $itemData['item_description'],
                        'expense_category' => $itemData['expense_category'] ?? $expenseClaim->expense_category,
                        'quantity' => $itemData['quantity'] ?? 1.00,
                        'unit_of_measure' => $itemData['unit_of_measure'] ?? null,
                        'unit_price' => $itemData['unit_price'] ?? 0.00,
                        'receipt_reference' => $itemData['receipt_reference'] ?? null,
                    ]);
                }
                $expenseClaim->recalculateTotal();
            }

            return response()->json([
                'message' => 'Expense claim updated successfully',
                'data' => new ExpenseClaimResource($expenseClaim->fresh(['claimant', 'pettyCashAccount', 'project', 'site', 'items'])),
            ]);
        });
    }

    /**
     * Remove the specified expense claim.
     */
    public function destroy(ExpenseClaim $expenseClaim): JsonResponse
    {
        $this->authorize('delete', $expenseClaim);

        if ($expenseClaim->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft expense claims can be deleted.',
            ], 422);
        }

        $expenseClaim->delete();

        return response()->json(['message' => 'Expense claim deleted successfully']);
    }

    /**
     * Submit expense claim for verification.
     */
    public function submit(Request $request, ExpenseClaim $expenseClaim): JsonResponse
    {
        $this->authorize('update', $expenseClaim);

        if (!in_array($expenseClaim->status, ['draft', 'rejected'])) {
            return response()->json(['message' => 'Only draft or rejected claims can be submitted.'], 422);
        }

        $expenseClaim->submit();

        return response()->json([
            'message' => 'Expense claim submitted for review',
            'data' => new ExpenseClaimResource($expenseClaim->fresh(['claimant', 'project', 'site'])),
        ]);
    }

    /**
     * Site Manager verification sign-off.
     */
    public function verifySite(VerifyExpenseClaimRequest $request, ExpenseClaim $expenseClaim): JsonResponse
    {
        $this->authorize('verifySite', $expenseClaim);

        if ($expenseClaim->status !== 'submitted') {
            return response()->json(['message' => "Claim must be in 'submitted' status for Site Manager verification."], 422);
        }

        $expenseClaim->verifySiteManager(auth()->user(), $request->notes);

        return response()->json([
            'message' => 'Expense claim verified by Site Manager',
            'data' => new ExpenseClaimResource($expenseClaim->fresh(['claimant', 'siteManager'])),
        ]);
    }

    /**
     * Finance Officer approval sign-off.
     */
    public function approveFinance(ApproveExpenseClaimRequest $request, ExpenseClaim $expenseClaim): JsonResponse
    {
        $this->authorize('approveFinance', $expenseClaim);

        if (!in_array($expenseClaim->status, ['submitted', 'verified_by_site_manager'])) {
            return response()->json(['message' => "Claim must be submitted or verified by Site Manager before Finance approval."], 422);
        }

        $expenseClaim->approveFinance(auth()->user(), $request->notes);

        return response()->json([
            'message' => 'Expense claim approved by Finance Officer',
            'data' => new ExpenseClaimResource($expenseClaim->fresh(['claimant', 'financeOfficer'])),
        ]);
    }

    /**
     * Administrator authorization sign-off.
     */
    public function authorizeAdmin(Request $request, ExpenseClaim $expenseClaim): JsonResponse
    {
        $this->authorize('authorizeAdmin', $expenseClaim);

        if ($expenseClaim->status !== 'approved_by_finance') {
            return response()->json(['message' => "Claim must be approved by Finance before Executive authorization."], 422);
        }

        $request->validate(['notes' => 'nullable|string|max:1000']);
        $expenseClaim->authorizeAdmin(auth()->user(), $request->notes);

        return response()->json([
            'message' => 'Expense claim authorized by Administrator',
            'data' => new ExpenseClaimResource($expenseClaim->fresh(['claimant', 'admin'])),
        ]);
    }

    /**
     * Mark claim as reimbursed / paid.
     */
    public function reimburse(ReimburseExpenseClaimRequest $request, ExpenseClaim $expenseClaim): JsonResponse
    {
        $this->authorize('pay', $expenseClaim);

        if (!in_array($expenseClaim->status, ['approved_by_finance', 'authorized_by_admin'])) {
            return response()->json(['message' => "Claim must be approved by Finance or Admin before reimbursement."], 422);
        }

        try {
            $expenseClaim->reimburse(auth()->user(), $request->payment_reference, $request->getPettyCashAccountId());

            return response()->json([
                'message' => 'Expense claim reimbursed successfully',
                'data' => new ExpenseClaimResource($expenseClaim->fresh(['claimant', 'pettyCashAccount', 'paidBy'])),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Reject expense claim with reason.
     */
    public function reject(Request $request, ExpenseClaim $expenseClaim): JsonResponse
    {
        $this->authorize('update', $expenseClaim);

        if (in_array($expenseClaim->status, ['reimbursed', 'rejected'])) {
            return response()->json(['message' => "Expense claim is already {$expenseClaim->status}."], 422);
        }

        $request->validate(['rejection_reason' => 'required|string|max:1000']);
        $expenseClaim->reject(auth()->user(), $request->rejection_reason);

        return response()->json([
            'message' => 'Expense claim rejected',
            'data' => new ExpenseClaimResource($expenseClaim->fresh(['claimant'])),
        ]);
    }

    /**
     * Summary metrics and category spend statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ExpenseClaim::class);

        $query = ExpenseClaim::query();

        if ($request->filled('project_id')) {
            $projectId = $request->project_id;
            if (is_numeric($projectId)) {
                $query->where('project_id', $projectId);
            } else {
                $project = Project::where('uuid', $projectId)->first();
                if ($project) $query->where('project_id', $project->id);
            }
        }

        if ($request->filled('site_id')) {
            $siteId = $request->site_id;
            if (is_numeric($siteId)) {
                $query->where('site_id', $siteId);
            } else {
                $site = Site::where('uuid', $siteId)->first();
                if ($site) $query->where('site_id', $site->id);
            }
        }

        $totalClaims = (clone $query)->count();
        $draftCount = (clone $query)->where('status', 'draft')->count();
        $submittedCount = (clone $query)->where('status', 'submitted')->count();
        $verifiedCount = (clone $query)->where('status', 'verified_by_site_manager')->count();
        $approvedCount = (clone $query)->where('status', 'approved_by_finance')->count();
        $authorizedCount = (clone $query)->where('status', 'authorized_by_admin')->count();
        $reimbursedCount = (clone $query)->where('status', 'reimbursed')->count();
        $rejectedCount = (clone $query)->where('status', 'rejected')->count();

        $totalClaimed = (float) (clone $query)->sum('total_amount');
        $totalReimbursed = (float) (clone $query)->where('status', 'reimbursed')->sum('total_amount');
        $pendingPayout = (float) (clone $query)->whereIn('status', ['submitted', 'verified_by_site_manager', 'approved_by_finance', 'authorized_by_admin'])->sum('total_amount');

        // Expenditure by category
        $byCategory = (clone $query)->select('expense_category', DB::raw('SUM(total_amount) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy('expense_category')
            ->get();

        return response()->json([
            'data' => [
                'total_claims' => $totalClaims,
                'draft_count' => $draftCount,
                'submitted_count' => $submittedCount,
                'verified_count' => $verifiedCount,
                'approved_count' => $approvedCount,
                'authorized_count' => $authorizedCount,
                'reimbursed_count' => $reimbursedCount,
                'rejected_count' => $rejectedCount,
                'total_claimed_amount' => $totalClaimed,
                'total_reimbursed_amount' => $totalReimbursed,
                'pending_payout_amount' => $pendingPayout,
                'by_category' => $byCategory,
            ],
        ]);
    }
}
