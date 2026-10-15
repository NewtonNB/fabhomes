<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\Unit;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSavingsAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'account_type' => 'nullable|in:land_saving,construction_saving',
            'scheme_name' => 'nullable|string|max:100',
            'target_amount' => 'nullable|numeric|min:1000',
            'status' => 'nullable|in:active,suspended,completed,closed',
            'opened_date' => 'nullable|date',
            'target_date' => 'nullable|date',
            'closed_date' => 'nullable|date',
            'plot_id' => 'nullable',
            'project_id' => 'nullable',
            'notes' => 'nullable|string|max:2000',
        ];
    }

    public function getPlotId(): ?int
    {
        if (!$this->has('plot_id')) {
            return null;
        }

        $id = $this->input('plot_id');
        if (!$id) {
            return null;
        }

        if (is_numeric($id)) {
            return (int) $id;
        }

        $unit = Unit::where('uuid', $id)->first();
        return $unit ? $unit->id : null;
    }

    public function getProjectId(): ?int
    {
        if (!$this->has('project_id')) {
            return null;
        }

        $id = $this->input('project_id');
        if (!$id) {
            return null;
        }

        if (is_numeric($id)) {
            return (int) $id;
        }

        $project = Project::where('uuid', $id)->first();
        return $project ? $project->id : null;
    }
}
