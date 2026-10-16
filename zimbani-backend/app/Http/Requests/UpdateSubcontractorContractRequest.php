<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\Site;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSubcontractorContractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'project_id' => 'nullable',
            'site_id' => 'nullable',
            'title' => 'sometimes|required|string|max:255',
            'subcontractor_name' => 'sometimes|required|string|max:255',
            'subcontractor_contact_person' => 'nullable|string|max:255',
            'subcontractor_phone' => 'sometimes|required|string|max:50',
            'subcontractor_email' => 'nullable|email|max:255',
            'tax_identification_number' => 'nullable|string|max:100',
            'trade_category' => 'sometimes|required|string|in:masonry,electrical,plumbing,roofing,painting,steelwork,carpentry,tiling,landscaping,earthworks,other',
            'scope_of_work' => 'sometimes|required|string',
            'contract_sum' => 'sometimes|required|numeric|min:1',
            'currency' => 'nullable|string|max:3',
            'retention_percentage' => 'nullable|numeric|min:0|max:100',
            'start_date' => 'sometimes|required|date',
            'expected_completion_date' => 'sometimes|required|date',
            'actual_completion_date' => 'nullable|date',
            'payment_terms' => 'nullable|string',
            'status' => 'nullable|string|in:draft,active,suspended,completed,terminated',
            'notes' => 'nullable|string',
        ];
    }

    public function getProjectId(): ?int
    {
        $id = $this->input('project_id');
        if (!$id) return null;
        if (is_numeric($id)) return (int) $id;
        $project = Project::where('uuid', $id)->first();
        return $project ? $project->id : null;
    }

    public function getSiteId(): ?int
    {
        $id = $this->input('site_id');
        if (!$id) return null;
        if (is_numeric($id)) return (int) $id;
        $site = Site::where('uuid', $id)->first();
        return $site ? $site->id : null;
    }
}
