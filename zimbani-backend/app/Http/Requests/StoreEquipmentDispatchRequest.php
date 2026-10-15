<?php

namespace App\Http\Requests;

use App\Models\Equipment;
use App\Models\Site;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreEquipmentDispatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'equipment_id' => 'required|exists:equipment,id',
            'from_site_id' => 'nullable|exists:sites,id',
            'to_site_id' => 'required|exists:sites,id',
            'project_id' => 'nullable|exists:projects,id',
            'operator_id' => 'nullable|exists:users,id',
            'dispatched_at' => 'nullable|date',
            'expected_return_date' => 'nullable|date',
            'status' => 'nullable|in:pending,in_transit,active_on_site,returned,cancelled',
            'purpose' => 'required|string|max:255',
            'transport_cost' => 'nullable|numeric|min:0',
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

        if ($this->has('from_site_id') && !empty($this->from_site_id) && !is_numeric($this->from_site_id)) {
            $site = Site::where('uuid', $this->from_site_id)->first();
            if ($site) {
                $this->merge(['from_site_id' => $site->id]);
            }
        }

        if ($this->has('to_site_id') && !empty($this->to_site_id) && !is_numeric($this->to_site_id)) {
            $site = Site::where('uuid', $this->to_site_id)->first();
            if ($site) {
                $this->merge(['to_site_id' => $site->id]);
            }
        }

        if ($this->has('project_id') && !empty($this->project_id) && !is_numeric($this->project_id)) {
            $project = Project::where('uuid', $this->project_id)->first();
            if ($project) {
                $this->merge(['project_id' => $project->id]);
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
