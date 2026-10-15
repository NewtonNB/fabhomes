<?php

namespace App\Http\Requests;

use App\Models\Site;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreRequisitionRequest extends FormRequest
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
            'priority' => 'nullable|in:low,medium,high,urgent',
            'required_by_date' => 'nullable|date',
            'total_estimated_cost' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'items' => 'required|array|min:1',
            'items.*.material_id' => 'nullable|exists:materials,id',
            'items.*.material_name' => 'required|string|max:255',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit' => 'nullable|string|max:50',
            'items.*.unit_of_measure' => 'nullable|string|max:50',
            'items.*.estimated_unit_cost' => 'nullable|numeric|min:0',
            'items.*.total_cost' => 'nullable|numeric|min:0',
            'items.*.notes' => 'nullable|string|max:500',
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

        // Convert material UUIDs in items array if passed as UUID, and normalize unit / unit_of_measure
        if ($this->has('items') && is_array($this->items)) {
            $items = $this->items;
            foreach ($items as &$item) {
                if (!empty($item['unit_of_measure']) && empty($item['unit'])) {
                    $item['unit'] = $item['unit_of_measure'];
                }
                if (!empty($item['unit']) && empty($item['unit_of_measure'])) {
                    $item['unit_of_measure'] = $item['unit'];
                }
                if (empty($item['unit']) && empty($item['unit_of_measure'])) {
                    $item['unit'] = 'units';
                    $item['unit_of_measure'] = 'units';
                }

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
