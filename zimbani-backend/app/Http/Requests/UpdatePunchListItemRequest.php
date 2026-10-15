<?php

namespace App\Http\Requests;

use App\Models\SiteInspection;
use App\Models\Site;
use App\Models\Project;
use App\Models\Unit;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePunchListItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'site_inspection_id' => 'nullable|exists:site_inspections,id',
            'site_id' => 'sometimes|required|exists:sites,id',
            'project_id' => 'nullable|exists:projects,id',
            'unit_id' => 'nullable|exists:units,id',
            'task_id' => 'nullable|exists:tasks,id',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string|max:5000',
            'location_details' => 'nullable|string|max:255',
            'category' => 'nullable|in:structural,architectural,plumbing,electrical,finishing,safety,other',
            'severity' => 'nullable|in:low,medium,high,critical',
            'status' => 'nullable|in:open,in_progress,rectified,verified_closed,waived',
            'due_date' => 'nullable|date',
            'assigned_to' => 'nullable|exists:users,id',
            'subcontractor_name' => 'nullable|string|max:255',
            'rectification_notes' => 'nullable|string|max:5000',
            'verification_notes' => 'nullable|string|max:5000',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('site_inspection_id') && !empty($this->site_inspection_id) && !is_numeric($this->site_inspection_id)) {
            $ins = SiteInspection::where('uuid', $this->site_inspection_id)->first();
            if ($ins) {
                $this->merge(['site_inspection_id' => $ins->id]);
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

        if ($this->has('assigned_to') && !empty($this->assigned_to) && !is_numeric($this->assigned_to)) {
            $user = User::where('uuid', $this->assigned_to)->first();
            if ($user) {
                $this->merge(['assigned_to' => $user->id]);
            }
        }
    }
}
