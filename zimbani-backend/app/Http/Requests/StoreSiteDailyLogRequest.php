<?php

namespace App\Http\Requests;

use App\Models\Site;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreSiteDailyLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'site_id' => 'required|exists:sites,id',
            'project_id' => 'nullable|exists:projects,id',
            'log_date' => 'required|date',
            'weather_condition' => 'required|in:clear,sunny,partly_cloudy,cloudy,light_rain,heavy_rain,stormy,high_winds',
            'temperature_celsius' => 'nullable|numeric|between:-10,60',
            'work_delayed_by_weather' => 'nullable|boolean',
            'delay_hours' => 'nullable|numeric|min:0|max:24',
            'labor_headcount' => 'required|integer|min:0',
            'subcontractor_headcount' => 'nullable|integer|min:0',
            'work_performed_summary' => 'required|string|max:10000',
            'delays_or_impediments' => 'nullable|string|max:5000',
            'materials_received_notes' => 'nullable|string|max:5000',
            'equipment_on_site_notes' => 'nullable|string|max:5000',
            'visitors_log' => 'nullable|string|max:5000',
            'supervisor_id' => 'nullable|exists:users,id',
            'status' => 'nullable|in:draft,submitted,approved',
            'notes' => 'nullable|string|max:5000',
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

        if ($this->has('supervisor_id') && !empty($this->supervisor_id) && !is_numeric($this->supervisor_id)) {
            $user = User::where('uuid', $this->supervisor_id)->first();
            if ($user) {
                $this->merge(['supervisor_id' => $user->id]);
            }
        }

        if (!$this->has('supervisor_id') || empty($this->supervisor_id)) {
            $this->merge(['supervisor_id' => auth()->id()]);
        }
    }
}
