<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentDispatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'dispatch_number' => $this->dispatch_number,
            'status' => $this->status,
            'dispatched_at' => $this->dispatched_at?->toISOString(),
            'expected_return_date' => $this->expected_return_date?->toDateString(),
            'actual_return_date' => $this->actual_return_date?->toDateString(),
            'purpose' => $this->purpose,
            'transport_cost' => $this->transport_cost ? (float) $this->transport_cost : null,
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
                ];
            }),

            'from_site' => $this->when($this->relationLoaded('fromSite') && $this->fromSite, function () {
                return [
                    'id' => $this->fromSite->id,
                    'uuid' => $this->fromSite->uuid,
                    'name' => $this->fromSite->name,
                    'code' => $this->fromSite->code,
                ];
            }),

            'to_site' => $this->when($this->relationLoaded('toSite') && $this->toSite, function () {
                return [
                    'id' => $this->toSite->id,
                    'uuid' => $this->toSite->uuid,
                    'name' => $this->toSite->name,
                    'code' => $this->toSite->code,
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

            'operator' => $this->when($this->relationLoaded('operator') && $this->operator, function () {
                return [
                    'id' => $this->operator->id,
                    'uuid' => $this->operator->uuid,
                    'name' => $this->operator->name,
                    'email' => $this->operator->email,
                ];
            }),

            'dispatched_by' => $this->when($this->relationLoaded('dispatchedByUser') && $this->dispatchedByUser, function () {
                return [
                    'id' => $this->dispatchedByUser->id,
                    'uuid' => $this->dispatchedByUser->uuid,
                    'name' => $this->dispatchedByUser->name,
                ];
            }),

            'received_by' => $this->when($this->relationLoaded('receivedByUser') && $this->receivedByUser, function () {
                return [
                    'id' => $this->receivedByUser->id,
                    'uuid' => $this->receivedByUser->uuid,
                    'name' => $this->receivedByUser->name,
                ];
            }),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
