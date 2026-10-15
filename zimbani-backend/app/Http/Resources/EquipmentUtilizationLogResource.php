<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentUtilizationLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'log_number' => $this->log_number,
            'date' => $this->date?->toDateString(),
            'start_meter_reading' => $this->start_meter_reading ? (float) $this->start_meter_reading : null,
            'end_meter_reading' => $this->end_meter_reading ? (float) $this->end_meter_reading : null,
            'hours_operated' => (float) $this->hours_operated,
            'hourly_rate' => $this->hourly_rate ? (float) $this->hourly_rate : null,
            'fuel_litres_used' => $this->fuel_litres_used ? (float) $this->fuel_litres_used : null,
            'total_cost' => $this->total_cost ? (float) $this->total_cost : null,
            'purpose' => $this->purpose,
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
                    'hourly_rate' => (float) $this->equipment->hourly_rate,
                ];
            }),

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

            'task' => $this->when($this->relationLoaded('task') && $this->task, function () {
                return [
                    'id' => $this->task->id,
                    'uuid' => $this->task->uuid,
                    'task_number' => $this->task->task_number,
                    'title' => $this->task->title,
                ];
            }),

            'operator' => $this->when($this->relationLoaded('operator') && $this->operator, function () {
                return [
                    'id' => $this->operator->id,
                    'uuid' => $this->operator->uuid,
                    'name' => $this->operator->name,
                ];
            }),

            'logged_by' => $this->when($this->relationLoaded('loggedByUser') && $this->loggedByUser, function () {
                return [
                    'id' => $this->loggedByUser->id,
                    'uuid' => $this->loggedByUser->uuid,
                    'name' => $this->loggedByUser->name,
                ];
            }),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
