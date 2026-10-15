<?php

namespace App\Http\Requests;

use App\Models\Site;
use App\Models\Project;
use App\Models\SiteDailyLog;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreToolboxTalkRequest extends FormRequest
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
            'conducted_by' => 'nullable|exists:users,id',
            'topic' => 'required|string|max:255',
            'category' => 'required|in:ppe,working_at_height,electrical_safety,excavation,heavy_equipment,fire_safety,housekeeping,heat_stress,hazardous_materials,other',
            'conducted_at' => 'required|date',
            'duration_minutes' => 'nullable|integer|min:1|max:480',
            'attendees_count' => 'required|integer|min:0',
            'attendees_names' => 'nullable|array',
            'attendees_names.*' => 'string|max:255',
            'key_discussion_points' => 'required|string|max:10000',
            'hazards_identified' => 'nullable|string|max:5000',
            'supervisor_notes' => 'nullable|string|max:5000',
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

        if ($this->has('conducted_by') && !empty($this->conducted_by) && !is_numeric($this->conducted_by)) {
            $user = User::where('uuid', $this->conducted_by)->first();
            if ($user) {
                $this->merge(['conducted_by' => $user->id]);
            }
        }

        if (!$this->has('conducted_by') || empty($this->conducted_by)) {
            $this->merge(['conducted_by' => auth()->id()]);
        }
    }
}
