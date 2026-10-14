<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\Site;
use App\Models\Unit;
use App\Models\ConstructionMilestone;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'project_id' => 'sometimes|required|exists:projects,id',
            'site_id' => 'nullable|exists:sites,id',
            'unit_id' => 'nullable|exists:units,id',
            'milestone_id' => 'nullable|exists:construction_milestones,id',
            'assigned_to' => 'nullable|exists:users,id',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'status' => 'nullable|in:pending,in_progress,completed,blocked,cancelled',
            'completion_percentage' => 'nullable|numeric|min:0|max:100',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'estimated_hours' => 'nullable|numeric|min:0|max:99999.99',
            'actual_hours' => 'nullable|numeric|min:0|max:99999.99',
            'notes' => 'nullable|string|max:5000',
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

        if ($this->has('site_id') && !empty($this->site_id) && !is_numeric($this->site_id)) {
            $site = Site::where('uuid', $this->site_id)->first();
            if ($site) {
                $this->merge(['site_id' => $site->id]);
            }
        }

        if ($this->has('unit_id') && !empty($this->unit_id) && !is_numeric($this->unit_id)) {
            $unit = Unit::where('uuid', $this->unit_id)->first();
            if ($unit) {
                $this->merge(['unit_id' => $unit->id]);
            }
        }

        if ($this->has('milestone_id') && !empty($this->milestone_id) && !is_numeric($this->milestone_id)) {
            $milestone = ConstructionMilestone::where('uuid', $this->milestone_id)->first();
            if ($milestone) {
                $this->merge(['milestone_id' => $milestone->id]);
            }
        }

        if ($this->has('assigned_to') && !empty($this->assigned_to) && !is_numeric($this->assigned_to)) {
            $user = User::where('uuid', $this->assigned_to)->first();
            if ($user) {
                $this->merge(['assigned_to' => $user->id]);
            }
        }
    }
}
