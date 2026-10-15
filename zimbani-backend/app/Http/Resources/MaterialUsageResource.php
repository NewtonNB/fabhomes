<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MaterialUsageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'usage_number' => $this->usage_number,
            'quantity_used' => (float) $this->quantity_used,
            'unit_of_measure' => $this->unit_of_measure,
            'unit_cost_at_usage' => $this->unit_cost_at_usage ? (float) $this->unit_cost_at_usage : null,
            'total_cost' => $this->total_cost ? (float) $this->total_cost : null,
            'used_date' => $this->used_date?->toDateString(),
            'purpose' => $this->purpose,
            'notes' => $this->notes,
            
            // Relationships
            'material' => $this->when($this->relationLoaded('material') && $this->material, function () {
                return [
                    'id' => $this->material->id,
                    'uuid' => $this->material->uuid,
                    'material_code' => $this->material->material_code,
                    'name' => $this->material->name,
                    'category' => $this->material->category,
                    'unit_of_measure' => $this->material->unit_of_measure,
                    'current_stock' => (float) $this->material->current_stock,
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
            
            'milestone' => $this->when($this->relationLoaded('milestone') && $this->milestone, function () {
                return [
                    'id' => $this->milestone->id,
                    'uuid' => $this->milestone->uuid,
                    'milestone_name' => $this->milestone->milestone_name,
                    'milestone_order' => $this->milestone->milestone_order,
                ];
            }),
            
            'unit' => $this->when($this->relationLoaded('unit') && $this->unit, function () {
                return [
                    'id' => $this->unit->id,
                    'uuid' => $this->unit->uuid,
                    'unit_number' => $this->unit->unit_number,
                ];
            }),
            
            'logged_by' => $this->when($this->relationLoaded('loggedByUser') && $this->loggedByUser, function () {
                return [
                    'id' => $this->loggedByUser->id,
                    'uuid' => $this->loggedByUser->uuid,
                    'name' => $this->loggedByUser->name,
                ];
            }),
            
            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
