<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MaterialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $currentStock = (float) $this->current_stock;
        $unitCost = (float) $this->unit_cost;
        $totalValuation = $currentStock * $unitCost;

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'material_code' => $this->material_code,
            'name' => $this->name,
            'category' => $this->category,
            'unit_of_measure' => $this->unit_of_measure,
            'unit_cost' => $unitCost,
            'currency' => $this->currency ?? 'UGX',
            
            // Stock levels
            'current_stock' => $currentStock,
            'minimum_stock_level' => (float) $this->minimum_stock_level,
            'reorder_quantity' => (float) $this->reorder_quantity,
            'total_valuation' => $totalValuation,
            'storage_location' => $this->storage_location,
            'status' => $this->status,
            'is_low_stock' => $this->status === 'low_stock' || ($this->minimum_stock_level > 0 && $currentStock <= $this->minimum_stock_level),
            'is_out_of_stock' => $this->status === 'out_of_stock' || $currentStock <= 0,
            
            // Supplier & Details
            'supplier_name' => $this->supplier_name,
            'supplier_contact' => $this->supplier_contact,
            'description' => $this->description,
            'metadata' => $this->metadata,
            
            // Relationships
            'site' => $this->when($this->relationLoaded('site') && $this->site, function () {
                return [
                    'id' => $this->site->id,
                    'uuid' => $this->site->uuid,
                    'name' => $this->site->name,
                    'code' => $this->site->code,
                ];
            }),
            
            'usages_count' => $this->when(isset($this->usages_count), $this->usages_count),
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),
            
            'created_by' => $this->when($this->relationLoaded('createdByUser') && $this->createdByUser, function () {
                return [
                    'id' => $this->createdByUser->id,
                    'name' => $this->createdByUser->name,
                ];
            }),
            
            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
