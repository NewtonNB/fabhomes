<?php

namespace App\Http\Requests;

use App\Models\Material;
use App\Models\Site;
use App\Models\Project;
use App\Models\Task;
use App\Models\ConstructionMilestone;
use App\Models\Unit;
use Illuminate\Foundation\Http\FormRequest;

class StoreUsageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'material_id' => 'required|exists:materials,id',
            'site_id' => 'required|exists:sites,id',
            'project_id' => 'nullable|exists:projects,id',
            'task_id' => 'nullable|exists:tasks,id',
            'milestone_id' => 'nullable|exists:construction_milestones,id',
            'unit_id' => 'nullable|exists:units,id',
            'quantity_used' => 'required|numeric|min:0.01',
            'unit_of_measure' => 'nullable|string|max:50',
            'unit_cost_at_usage' => 'nullable|numeric|min:0',
            'total_cost' => 'nullable|numeric|min:0',
            'used_date' => 'required|date',
            'purpose' => 'required|string|max:255',
            'notes' => 'nullable|string|max:2000',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('material_id') && !empty($this->material_id) && !is_numeric($this->material_id)) {
            $mat = Material::where('uuid', $this->material_id)->first();
            if ($mat) {
                $this->merge(['material_id' => $mat->id]);
            }
        }

        if ($this->has('site_id') && !empty($this->site_id) && !is_numeric($this->site_id)) {
            $site = Site::where('uuid', $this->site_id)->first();
            if ($site) {
                $this->merge(['site_id' => $site->id]);
            }
        }

        if ($this->has('project_id') && !empty($this->project_id) && !is_numeric($this->project_id)) {
            $project = Project::where('uuid', $this->project_id)->first();
            if ($project) {
                $this->merge(['project_id' => $project->id]);
            }
        }

        if ($this->has('task_id') && !empty($this->task_id) && !is_numeric($this->task_id)) {
            $task = Task::where('uuid', $this->task_id)->first();
            if ($task) {
                $this->merge(['task_id' => $task->id]);
            }
        }

        if ($this->has('milestone_id') && !empty($this->milestone_id) && !is_numeric($this->milestone_id)) {
            $ms = ConstructionMilestone::where('uuid', $this->milestone_id)->first();
            if ($ms) {
                $this->merge(['milestone_id' => $ms->id]);
            }
        }

        if ($this->has('unit_id') && !empty($this->unit_id) && !is_numeric($this->unit_id)) {
            $unit = Unit::where('uuid', $this->unit_id)->first();
            if ($unit) {
                $this->merge(['unit_id' => $unit->id]);
            }
        }
    }
}
