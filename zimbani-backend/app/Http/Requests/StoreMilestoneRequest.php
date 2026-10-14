<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreMilestoneRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'project_id' => 'required|exists:projects,id',
            'milestone_name' => 'required|string|max:255',
            'milestone_order' => 'nullable|integer|min:1',
            'description' => 'nullable|string|max:5000',
            'planned_start_date' => 'nullable|date',
            'planned_end_date' => 'nullable|date|after_or_equal:planned_start_date',
            'actual_start_date' => 'nullable|date',
            'actual_end_date' => 'nullable|date|after_or_equal:actual_start_date',
            'estimated_cost' => 'nullable|numeric|min:0|max:999999999999.99',
            'actual_cost' => 'nullable|numeric|min:0|max:999999999999.99',
            'currency' => 'nullable|string|size:3',
            'status' => 'nullable|in:pending,in_progress,completed,skipped',
            'completion_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:5000',
            'completion_notes' => 'nullable|string|max:5000',
            'metadata' => 'nullable|array',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('project_id') && !is_numeric($this->project_id)) {
            $project = Project::where('uuid', $this->project_id)->first();
            if ($project) {
                $this->merge(['project_id' => $project->id]);
            }
        }
    }
}
