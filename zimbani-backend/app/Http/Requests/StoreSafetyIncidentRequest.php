<?php

namespace App\Http\Requests;

use App\Models\Site;
use App\Models\Project;
use App\Models\SiteDailyLog;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreSafetyIncidentRequest extends FormRequest
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
            'site_daily_log_id' => 'nullable|exists:site_daily_logs,id',
            'incident_type' => 'required|in:near_miss,first_aid,medical_treatment,lost_time_injury,property_damage,environmental,security,other',
            'severity' => 'required|in:low,medium,high,critical',
            'incident_date' => 'required|date',
            'incident_time' => 'nullable|date_format:H:i',
            'location_details' => 'required|string|max:255',
            'title' => 'required|string|max:255',
            'description' => 'required|string|max:10000',
            'immediate_actions_taken' => 'nullable|string|max:5000',
            'root_cause_analysis' => 'nullable|string|max:5000',
            'preventative_measures' => 'nullable|string|max:5000',
            'injured_person_name' => 'nullable|string|max:255',
            'injured_person_type' => 'nullable|in:worker,subcontractor,visitor,public,none',
            'reported_by' => 'nullable|exists:users,id',
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

        if ($this->has('site_daily_log_id') && !empty($this->site_daily_log_id) && !is_numeric($this->site_daily_log_id)) {
            $log = SiteDailyLog::where('uuid', $this->site_daily_log_id)->first();
            if ($log) {
                $this->merge(['site_daily_log_id' => $log->id]);
            }
        }

        if ($this->has('reported_by') && !empty($this->reported_by) && !is_numeric($this->reported_by)) {
            $user = User::where('uuid', $this->reported_by)->first();
            if ($user) {
                $this->merge(['reported_by' => $user->id]);
            }
        }

        if (!$this->has('reported_by') || empty($this->reported_by)) {
            $this->merge(['reported_by' => auth()->id()]);
        }
    }
}
