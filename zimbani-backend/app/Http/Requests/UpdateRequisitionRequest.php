<?php

namespace App\Http\Requests;

use App\Models\Site;
use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;

class UpdateRequisitionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'site_id' => 'sometimes|required|exists:sites,id',
            'project_id' => 'nullable|exists:projects,id',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'status' => 'nullable|in:pending,approved,rejected,ordered,delivered,cancelled',
            'required_by_date' => 'nullable|date',
            'total_estimated_cost' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'items' => 'sometimes|required|array|min:1',
            'items.*.material_id' => 'nullable|exists:materials,id',
            'items.*.material_name' => 'required|string|max:255',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit' => 'required|string|max:50',
            'items.*.estimated_unit_cost' => 'nullable|numeric|min:0',
            'items.*.total_cost' => 'nullable|numeric|min:0',
            'items.*.notes' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:5000',
            'rejection_reason' => 'nullable|string|max:2000',
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

        if ($this->has('items') && is_array($this->items)) {
            $items = $this->items;
            foreach ($items as &$item) {
                if (!empty($item['material_id']) && !is_numeric($item['material_id'])) {
                    $mat = \App\Models\Material::where('uuid', $item['material_id'])->first();
                    if ($mat) {
                        $item['material_id'] = $mat->id;
                    }
                }
            }
            $this->merge(['items' => $items]);
        }
    }
}
