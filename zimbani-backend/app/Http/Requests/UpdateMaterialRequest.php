<?php

namespace App\Http\Requests;

use App\Models\Site;
use Illuminate\Foundation\Http\FormRequest;

class UpdateMaterialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $material = $this->route('material');
        $id = $material ? (is_object($material) ? $material->id : $material) : null;

        return [
            'name' => 'sometimes|required|string|max:255',
            'material_code' => "nullable|string|max:50|unique:materials,material_code,{$id}",
            'category' => 'nullable|in:cement,steel_rebar,aggregates_sand,masonry_blocks,timber_formwork,roofing,plumbing_electrical,finishes_paint,safety_tools,other',
            'unit_of_measure' => 'sometimes|required|string|max:50',
            'unit_cost' => 'sometimes|required|numeric|min:0|max:999999999999.99',
            'currency' => 'nullable|string|size:3',
            'site_id' => 'nullable|exists:sites,id',
            'current_stock' => 'nullable|numeric|min:0',
            'minimum_stock_level' => 'nullable|numeric|min:0',
            'reorder_quantity' => 'nullable|numeric|min:0',
            'storage_location' => 'nullable|string|max:255',
            'supplier_name' => 'nullable|string|max:255',
            'supplier_contact' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:5000',
            'status' => 'nullable|in:in_stock,low_stock,out_of_stock,discontinued',
            'metadata' => 'nullable|array',
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
    }
}
