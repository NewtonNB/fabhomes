<?php

namespace App\Http\Requests;

use App\Models\Equipment;
use App\Models\Site;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreUtilizationLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'equipment_id' => 'required|exists:equipment,id',
            'site_id' => 'required|exists:sites,id',
            'project_id' => 'nullable|exists:projects,id',
            'task_id' => 'nullable|exists:tasks,id',
            'operator_id' => 'nullable|exists:users,id',
            'date' => 'required|date',
            'start_meter_reading' => 'nullable|numeric|min:0',
            'end_meter_reading' => 'nullable|numeric|min:0',
            'hours_operated' => 'required|numeric|min:0.1',
            'hourly_rate' => 'nullable|numeric|min:0',
            'fuel_litres_used' => 'nullable|numeric|min:0',
            'total_cost' => 'nullable|numeric|min:0',
            'purpose' => 'required|string|max:255',
            'notes' => 'nullable|string|max:5000',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('equipment_id') && !empty($this->equipment_id) && !is_numeric($this->equipment_id)) {
            $eq = Equipment::where('uuid', $this->equipment_id)->first();
            if ($eq) {
                $this->merge(['equipment_id' => $eq->id]);
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

        if ($this->has('operator_id') && !empty($this->operator_id) && !is_numeric($this->operator_id)) {
            $op = User::where('uuid', $this->operator_id)->first();
            if ($op) {
                $this->merge(['operator_id' => $op->id]);
            }
        }
    }
}
