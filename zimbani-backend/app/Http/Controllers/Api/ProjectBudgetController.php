<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectBudget;
use App\Models\Site;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectBudgetController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of cost code budget allocations.
     */
    public function index(Request $request): JsonResponse
    {
        $query = ProjectBudget::with(['project', 'site', 'createdBy']);

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

        if ($request->filled('cost_category')) {
            $query->where('cost_category', $request->cost_category);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('budget_code', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%");
            });
        }

        $budgets = $query->orderBy('budget_code')->get();

        return response()->json([
            'data' => $budgets,
            'total_allocated' => (float) $budgets->sum('allocated_amount'),
        ]);
    }

    /**
     * Store a newly created budget allocation.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id' => 'required',
            'site_id' => 'nullable',
            'budget_code' => 'required|string|max:50',
            'name' => 'required|string|max:150',
            'cost_category' => 'required|in:subcontractor,materials,equipment,labour,direct_purchasing,permits_legal,contingency,other',
            'allocated_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $project = is_numeric($request->project_id)
            ? Project::findOrFail($request->project_id)
            : Project::where('uuid', $request->project_id)->firstOrFail();

        $siteId = null;
        if ($request->filled('site_id')) {
            $site = is_numeric($request->site_id)
                ? Site::find($request->site_id)
                : Site::where('uuid', $request->site_id)->first();
            if ($site) $siteId = $site->id;
        }

        $budget = ProjectBudget::create([
            'project_id' => $project->id,
            'site_id' => $siteId,
            'budget_code' => strtoupper(trim($request->budget_code)),
            'name' => trim($request->name),
            'cost_category' => $request->cost_category,
            'allocated_amount' => $request->allocated_amount,
            'currency' => 'UGX',
            'notes' => $request->notes,
        ]);

        return response()->json([
            'message' => 'Budget allocation created successfully',
            'data' => $budget->load(['project', 'site']),
        ], 201);
    }

    /**
     * Display the specified budget allocation.
     */
    public function show(ProjectBudget $projectBudget): JsonResponse
    {
        return response()->json([
            'data' => $projectBudget->load(['project', 'site', 'createdBy', 'updatedBy']),
        ]);
    }

    /**
     * Update the specified budget allocation.
     */
    public function update(Request $request, ProjectBudget $projectBudget): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:150',
            'cost_category' => 'sometimes|in:subcontractor,materials,equipment,labour,direct_purchasing,permits_legal,contingency,other',
            'allocated_amount' => 'sometimes|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $projectBudget->update($validated);

        return response()->json([
            'message' => 'Budget allocation updated successfully',
            'data' => $projectBudget->fresh(['project', 'site']),
        ]);
    }

    /**
     * Remove the specified budget allocation.
     */
    public function destroy(ProjectBudget $projectBudget): JsonResponse
    {
        $projectBudget->delete();

        return response()->json([
            'message' => 'Budget allocation deleted successfully',
        ]);
    }

    /**
     * Quick-Seed Standard Construction Cost Codes for a Project.
     */
    public function seedStandard(Request $request, string $projectUuid): JsonResponse
    {
        $project = Project::where('uuid', $projectUuid)->orWhere('id', $projectUuid)->firstOrFail();
        $totalProjectBudget = (float) ($project->budget ?? 100000000.00); // 100M UGX default if unset

        $templates = ProjectBudget::standardCostCodes();
        $created = [];

        foreach ($templates as $tpl) {
            $amount = round($totalProjectBudget * ($tpl['percentage'] / 100), 2);

            $budget = ProjectBudget::updateOrCreate(
                [
                    'project_id' => $project->id,
                    'budget_code' => $tpl['budget_code'],
                ],
                [
                    'name' => $tpl['name'],
                    'cost_category' => $tpl['cost_category'],
                    'allocated_amount' => $amount,
                    'currency' => 'UGX',
                    'notes' => "Standard construction allocation ({$tpl['percentage']}% of total project budget)",
                ]
            );

            $created[] = $budget;
        }

        return response()->json([
            'message' => "Successfully configured standard construction cost code budgets for {$project->name}",
            'project_budget' => $totalProjectBudget,
            'data' => $created,
        ]);
    }
}
