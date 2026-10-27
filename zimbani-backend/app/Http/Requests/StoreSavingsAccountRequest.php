<?php

namespace App\Http\Requests;

use App\Models\Client;
use App\Models\Project;
use App\Models\Unit;
use Illuminate\Foundation\Http\FormRequest;

class StoreSavingsAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorized via policy in controller
    }

    public function rules(): array
    {
        return [
            'client_id' => 'required',
            'account_type' => 'required|in:land_saving,construction_saving,tuzimbe_group',
            'scheme_name' => 'nullable|string|max:100',
            'group_code' => 'nullable|string|max:50',
            'cohort_year' => 'nullable|string|max:10',
            'package_code' => 'nullable|string|max:50',
            'target_amount' => 'required|numeric|min:1000',
            'currency' => 'nullable|string|size:3|in:UGX,USD,EUR',
            'opened_date' => 'nullable|date',
            'target_date' => 'nullable|date|after_or_equal:opened_date',
            'plot_id' => 'nullable',
            'project_id' => 'nullable',
            'notes' => 'nullable|string|max:2000',
        ];
    }

    public function getClientId(): int
    {
        $id = $this->input('client_id');
        if (is_numeric($id)) {
            return (int) $id;
        }

        $client = Client::where('uuid', $id)->firstOrFail();
        return $client->id;
    }

    public function getPlotId(): ?int
    {
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
