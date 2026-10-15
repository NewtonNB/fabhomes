<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MaterialRequisitionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'requisition_number' => $this->requisition_number,
            'status' => $this->status,
            'priority' => $this->priority,
            'required_by_date' => $this->required_by_date?->toDateString(),
            'total_estimated_cost' => (float) $this->total_estimated_cost,
            'currency' => $this->currency ?? 'UGX',
            'items' => $this->items ?? [],
            'items_count' => is_array($this->items) ? count($this->items) : 0,
            'notes' => $this->notes,
            'rejection_reason' => $this->rejection_reason,
            'approved_at' => $this->approved_at?->toISOString(),
            'delivered_at' => $this->delivered_at?->toISOString(),
            
            // Relationships
            'site' => $this->when($this->relationLoaded('site') && $this->site, function () {
                return [
                    'id' => $this->site->id,
                    'uuid' => $this->site->uuid,
                    'name' => $this->site->name,
                    'code' => $this->site->code,
                ];
            }),
            
            'project' => $this->when($this->relationLoaded('project') && $this->project, function () {
                return [
                    'id' => $this->project->id,
                    'uuid' => $this->project->uuid,
                    'name' => $this->project->name,
                    'code' => $this->project->code,
                ];
            }),
            
            'requested_by' => $this->when($this->relationLoaded('requestedByUser') && $this->requestedByUser, function () {
                return [
                    'id' => $this->requestedByUser->id,
                    'uuid' => $this->requestedByUser->uuid,
                    'name' => $this->requestedByUser->name,
                    'email' => $this->requestedByUser->email,
                ];
            }),
            
            'approved_by' => $this->when($this->relationLoaded('approvedByUser') && $this->approvedByUser, function () {
                return [
                    'id' => $this->approvedByUser->id,
                    'uuid' => $this->approvedByUser->uuid,
                    'name' => $this->approvedByUser->name,
                    'email' => $this->approvedByUser->email,
                ];
            }),
            
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),
            
            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
