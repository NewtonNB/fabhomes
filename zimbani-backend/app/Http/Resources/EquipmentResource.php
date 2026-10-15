<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $hourlyRate = $this->hourly_rate ? (float) $this->hourly_rate : null;
        $dailyRate = $this->daily_rate ? (float) $this->daily_rate : null;
        $totalHours = (float) $this->total_hours_operated;
        $purchasePrice = $this->purchase_price ? (float) $this->purchase_price : null;

        $nextServiceDue = $this->next_service_due_date;
        $isOverdueForService = $nextServiceDue && $nextServiceDue->isPast();
        $needsService = $this->condition === 'needs_repair' || $isOverdueForService;

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'equipment_code' => $this->equipment_code,
            'name' => $this->name,
            'type' => $this->type,
            'model_number' => $this->model_number,
            'serial_number' => $this->serial_number,
            'registration_number' => $this->registration_number,
            'ownership_type' => $this->ownership_type,
            
            // Rates & Financials
            'hourly_rate' => $hourlyRate,
            'daily_rate' => $dailyRate,
            'currency' => $this->currency ?? 'UGX',
            'purchase_date' => $this->purchase_date?->toDateString(),
            'purchase_price' => $purchasePrice,
            'supplier_or_vendor' => $this->supplier_or_vendor,
            
            // Status & Condition
            'status' => $this->status,
            'condition' => $this->condition,
            'total_hours_operated' => $totalHours,
            'last_service_date' => $this->last_service_date?->toDateString(),
            'next_service_due_date' => $this->next_service_due_date?->toDateString(),
            
            // Computed Helpers
            'is_available' => $this->status === 'available',
            'is_in_use' => $this->status === 'in_use',
            'is_under_maintenance' => $this->status === 'under_maintenance',
            'needs_service' => $needsService,
            'is_service_overdue' => $isOverdueForService,

            'notes' => $this->notes,
            'metadata' => $this->metadata,

            // Relationships
            'current_site' => $this->when($this->relationLoaded('currentSite') && $this->currentSite, function () {
                return [
                    'id' => $this->currentSite->id,
                    'uuid' => $this->currentSite->uuid,
                    'name' => $this->currentSite->name,
                    'code' => $this->currentSite->code,
                ];
            }),

            'assigned_operator' => $this->when($this->relationLoaded('assignedOperator') && $this->assignedOperator, function () {
                return [
                    'id' => $this->assignedOperator->id,
                    'uuid' => $this->assignedOperator->uuid,
                    'name' => $this->assignedOperator->name,
                    'email' => $this->assignedOperator->email,
                ];
            }),

            'created_by' => $this->when($this->relationLoaded('createdByUser') && $this->createdByUser, function () {
                return [
                    'id' => $this->createdByUser->id,
                    'uuid' => $this->createdByUser->uuid,
                    'name' => $this->createdByUser->name,
                ];
            }),

            'dispatches_count' => $this->when(isset($this->dispatches_count), $this->dispatches_count),
            'maintenance_logs_count' => $this->when(isset($this->maintenance_logs_count), $this->maintenance_logs_count),
            'utilization_logs_count' => $this->when(isset($this->utilization_logs_count), $this->utilization_logs_count),
            'documents' => DocumentResource::collection($this->whenLoaded('documents')),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
