<?php

namespace App\Http\Requests;

use App\Models\Site;
use App\Models\Project;
use App\Models\Unit;
use App\Models\Task;
use App\Models\ConstructionMilestone;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSiteInspectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'sometimes|required|string|max:255',
            'inspection_type' => 'sometimes|required|in:foundation,structural_framing,masonry,plumbing_rough_in,electrical_rough_in,concrete_pre_pour,waterproofing,finishing,handover_audit,safety_environmental,other',
            'site_id' => 'sometimes|required|exists:sites,id',
            'project_id' => 'nullable|exists:projects,id',
            'unit_id' => 'nullable|exists:units,id',
            'task_id' => 'nullable|exists:tasks,id',
            'milestone_id' => 'nullable|exists:construction_milestones,id',
            'inspector_id' => 'nullable|exists:users,id',
            'scheduled_date' => 'sometimes|required|date',
            'inspected_at' => 'nullable|date',
            'status' => 'nullable|in:scheduled,in_progress,passed,failed,passed_with_conditions,cancelled',
            'score' => 'nullable|numeric|between:0,100',
            'checklist_items' => 'nullable|array',
            'checklist_items.*.item_text' => 'required_with:checklist_items|string|max:255',
            'checklist_items.*.category' => 'nullable|string|max:100',
            'checklist_items.*.status' => 'nullable|in:pass,fail,na,pending',
            'checklist_items.*.notes' => 'nullable|string|max:1000',
            'summary_notes' => 'nullable|string|max:5000',
            'conditions' => 'nullable|string|max:5000',
        ];
    }

    protected function prepareForValidation(): void
    {
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

        if ($this->has('unit_id') && !empty($this->unit_id) && !is_numeric($this->unit_id)) {
            $unit = Unit::where('uuid', $this->unit_id)->first();
            if ($unit) {
                $this->merge(['unit_id' => $unit->id]);
            }
        }

        if ($this->has('task_id') && !empty($this->task_id) && !is_numeric($this->task_id)) {
            $task = Task::where('uuid', $this->task_id)->first();
            if ($task) {
                $this->merge(['task_id' => $task->id]);
            }
        }

        if ($this->has('milestone_id') && !empty($this->milestone_id) && !is_numeric($this->milestone_id)) {
            $milestone = ConstructionMilestone::where('uuid', $this->milestone_id)->first();
            if ($milestone) {
                $this->merge(['milestone_id' => $milestone->id]);
            }
        }

        if ($this->has('inspector_id') && !empty($this->inspector_id) && !is_numeric($this->inspector_id)) {
            $inspector = User::where('uuid', $this->inspector_id)->first();
            if ($inspector) {
                $this->merge(['inspector_id' => $inspector->id]);
            }
        }
    }
}
