<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentMaintenanceLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'maintenance_number' => $this->maintenance_number,
            'maintenance_type' => $this->maintenance_type,
            'status' => $this->status,
            'scheduled_date' => $this->scheduled_date?->toDateString(),
            'completed_date' => $this->completed_date?->toDateString(),
            'hours_at_maintenance' => $this->hours_at_maintenance ? (float) $this->hours_at_maintenance : null,
            'cost' => (float) $this->cost,
            'currency' => $this->currency ?? 'UGX',
            'service_provider' => $this->service_provider,
            'description' => $this->description,
            'parts_replaced' => $this->parts_replaced,
            'next_service_due_date' => $this->next_service_due_date?->toDateString(),
            'notes' => $this->notes,

            // Relationships
            'equipment' => $this->when($this->relationLoaded('equipment') && $this->equipment, function () {
                return [
                    'id' => $this->equipment->id,
                    'uuid' => $this->equipment->uuid,
                    'equipment_code' => $this->equipment->equipment_code,
                    'name' => $this->equipment->name,
                    'type' => $this->equipment->type,
                    'registration_number' => $this->equipment->registration_number,
                    'total_hours_operated' => (float) $this->equipment->total_hours_operated,
                ];
            }),

            'performed_by' => $this->when($this->relationLoaded('performedByUser') && $this->performedByUser, function () {
                return [
                    'id' => $this->performedByUser->id,
                    'uuid' => $this->performedByUser->uuid,
                    'name' => $this->performedByUser->name,
                ];
            }),

            'documents' => DocumentResource::collection($this->whenLoaded('documents')),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
