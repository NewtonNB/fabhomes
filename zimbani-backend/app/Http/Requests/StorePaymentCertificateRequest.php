<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\Site;
use App\Models\SubcontractorContract;
use Illuminate\Foundation\Http\FormRequest;

class StorePaymentCertificateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'contract_id' => 'required',
            'project_id' => 'nullable',
            'site_id' => 'nullable',
            'valuation_period_start' => 'required|date',
            'valuation_period_end' => 'required|date|after_or_equal:valuation_period_start',
            'valuation_date' => 'required|date',
            'certificate_type' => 'required|string|in:interim,practical_completion,final,retention_release',
            'gross_amount' => 'required|numeric|min:0',
            'previous_gross_amount' => 'nullable|numeric|min:0',
            'materials_on_site_value' => 'nullable|numeric|min:0',
            'retention_rate' => 'nullable|numeric|min:0|max:100',
            'withholding_tax_rate' => 'nullable|numeric|min:0|max:100',
            'other_deductions' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|max:3',
            'description' => 'required|string|max:500',
            'measurement_sheet_summary' => 'nullable|string',
        ];
    }

    public function getContract(): ?SubcontractorContract
    {
        $id = $this->input('contract_id');
        if (is_numeric($id)) {
            return SubcontractorContract::find($id);
        }
        return SubcontractorContract::where('uuid', $id)->first();
    }

    public function getProjectId(): ?int
    {
        $id = $this->input('project_id');
        if (!$id) {
            $contract = $this->getContract();
            return $contract ? $contract->project_id : null;
        }
        if (is_numeric($id)) return (int) $id;
        $project = Project::where('uuid', $id)->first();
        return $project ? $project->id : null;
    }

    public function getSiteId(): ?int
    {
        $id = $this->input('site_id');
        if (!$id) {
            $contract = $this->getContract();
            return $contract ? $contract->site_id : null;
        }
        if (is_numeric($id)) return (int) $id;
        $site = Site::where('uuid', $id)->first();
        return $site ? $site->id : null;
    }
}
